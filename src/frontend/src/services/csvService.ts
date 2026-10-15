import { Vessel, Berth, YardBlock, VesselStatus, PriorityLevel, BerthStatus } from '../types/operations';
import { calculateEstimatedEtd } from './etdEstimator';

export interface CsvValidationError {
  row?: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface CsvParseResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errors: CsvValidationError[];
  warnings: CsvValidationError[];
  vessels: Vessel[];
  berths?: Berth[];
  yardBlocks?: YardBlock[];
}

export const REQUIRED_COLUMNS = [
  'record_id',
  'vessel_id',
  'vessel_name',
  'vessel_type',
  'port',
  'terminal',
  'arrival_time',
  'turnaround_time_hours',
  'container_count',
  'berth_id',
  'berth_utilization',
  'crane_count',
  'cranes_available',
  'crane_utilization',
  'waiting_time_hours',
  'congestion_level',
  'congestion_score',
];

/**
 * Split CSV line respecting quotation marks
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Robust CSV Ingestion & Validation Engine
 */
export function validateAndParseCsv(csvText: string): CsvParseResult {
  const errors: CsvValidationError[] = [];
  const warnings: CsvValidationError[] = [];

  if (!csvText || !csvText.trim()) {
    return {
      isValid: false,
      totalRows: 0,
      validRows: 0,
      errors: [{ message: 'The uploaded CSV file is completely empty.', severity: 'error' }],
      warnings: [],
      vessels: [],
    };
  }

  const lines = csvText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) {
    return {
      isValid: false,
      totalRows: lines.length,
      validRows: 0,
      errors: [
        {
          message: 'CSV file must contain a header row and at least one data record.',
          severity: 'error',
        },
      ],
      warnings: [],
      vessels: [],
    };
  }

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map(h => h.toLowerCase());

  // Check required columns
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    errors.push({
      message: `Missing required column(s): ${missingColumns.join(', ')}`,
      severity: 'error',
    });
    return {
      isValid: false,
      totalRows: lines.length - 1,
      validRows: 0,
      errors,
      warnings,
      vessels: [],
    };
  }

  const headerIndexMap: Record<string, number> = {};
  headers.forEach((h, idx) => {
    headerIndexMap[h] = idx;
  });

  const seenRecordIds = new Set<string>();
  const seenVesselIds = new Set<string>();
  const parsedVessels: Vessel[] = [];

  // Berth metrics accumulator for berth state reconstruction
  const berthMap: Record<string, {
    utilizations: number[];
    queueCount: number;
    cranesAvailable: number[];
    maxCranes: number[];
    vesselIds: string[];
  }> = {};

  for (let r = 1; r < lines.length; r++) {
    const rowNum = r + 1; // 1-based index including header
    const rowValues = parseCsvLine(lines[r]);

    if (rowValues.length < headers.length) {
      warnings.push({
        row: rowNum,
        message: `Row ${rowNum} has ${rowValues.length} columns (expected ${headers.length}). Missing columns treated as empty.`,
        severity: 'warning',
      });
    }

    const getVal = (col: string): string => {
      const idx = headerIndexMap[col];
      return idx !== undefined && rowValues[idx] !== undefined ? rowValues[idx] : '';
    };

    const recordId = getVal('record_id');
    const vesselId = getVal('vessel_id');
    const vesselName = getVal('vessel_name');
    const vesselType = getVal('vessel_type');
    const port = getVal('port');
    const terminal = getVal('terminal');
    const arrivalTime = getVal('arrival_time');
    const actualEtd = getVal('etd');
    const estimatedEtdInput = getVal('estimated_etd');
    const turnaroundStr = getVal('turnaround_time_hours');
    const containerCountStr = getVal('container_count');
    const containersPendingStr = getVal('containers_pending');
    const berthId = getVal('berth_id') || 'B01';
    const berthUtilStr = getVal('berth_utilization');
    const craneCountStr = getVal('crane_count');
    const cranesAvailStr = getVal('cranes_available');
    const craneUtilStr = getVal('crane_utilization');
    const waitHoursStr = getVal('waiting_time_hours');
    const congestionScoreStr = getVal('congestion_score');
    const weatherCond = getVal('weather_condition') || 'Clear / Calm';
    const opStatusRaw = getVal('operational_status') || 'Berthed';

    // 1. Mandatory Identity Checks
    if (!recordId) {
      errors.push({ row: rowNum, column: 'record_id', message: `Row ${rowNum}: Missing record_id`, severity: 'error' });
    } else if (seenRecordIds.has(recordId)) {
      errors.push({ row: rowNum, column: 'record_id', message: `Row ${rowNum}: Duplicate record_id '${recordId}'`, severity: 'error' });
    } else {
      seenRecordIds.add(recordId);
    }

    if (!vesselId) {
      errors.push({ row: rowNum, column: 'vessel_id', message: `Row ${rowNum}: Missing vessel_id`, severity: 'error' });
    } else if (seenVesselIds.has(vesselId)) {
      warnings.push({ row: rowNum, column: 'vessel_id', message: `Row ${rowNum}: Vessel ID '${vesselId}' appears multiple times (multiple port calls)`, severity: 'warning' });
    } else {
      seenVesselIds.add(vesselId);
    }

    if (!vesselName) {
      errors.push({ row: rowNum, column: 'vessel_name', message: `Row ${rowNum}: Missing vessel_name`, severity: 'error' });
    }

    // 2. Date Validations
    if (!arrivalTime || isNaN(Date.parse(arrivalTime))) {
      errors.push({ row: rowNum, column: 'arrival_time', message: `Row ${rowNum}: Invalid arrival_time '${arrivalTime}'. Must be valid ISO timestamp.`, severity: 'error' });
    }

    if (actualEtd && isNaN(Date.parse(actualEtd))) {
      errors.push({ row: rowNum, column: 'etd', message: `Row ${rowNum}: Invalid etd timestamp '${actualEtd}'.`, severity: 'error' });
    }

    // 3. Number parsing & bounds validations
    const turnaroundHours = parseFloat(turnaroundStr);
    if (isNaN(turnaroundHours) || turnaroundHours < 0) {
      errors.push({ row: rowNum, column: 'turnaround_time_hours', message: `Row ${rowNum}: turnaround_time_hours must be a positive number (got '${turnaroundStr}')`, severity: 'error' });
    }

    const containerCount = parseInt(containerCountStr, 10);
    if (isNaN(containerCount) || containerCount < 0) {
      errors.push({ row: rowNum, column: 'container_count', message: `Row ${rowNum}: container_count must be a positive integer (got '${containerCountStr}')`, severity: 'error' });
    }

    const containersPending = containersPendingStr ? parseInt(containersPendingStr, 10) : Math.round(containerCount * 0.4);
    if (!isNaN(containersPending) && containersPending > containerCount) {
      warnings.push({ row: rowNum, column: 'containers_pending', message: `Row ${rowNum}: containers_pending (${containersPending}) exceeds total container_count (${containerCount})`, severity: 'warning' });
    }

    const berthUtil = parseFloat(berthUtilStr);
    if (isNaN(berthUtil) || berthUtil < 0 || berthUtil > 100) {
      errors.push({ row: rowNum, column: 'berth_utilization', message: `Row ${rowNum}: berth_utilization must be between 0 and 100% (got '${berthUtilStr}')`, severity: 'error' });
    }

    const craneCount = parseInt(craneCountStr, 10);
    if (isNaN(craneCount) || craneCount < 1) {
      errors.push({ row: rowNum, column: 'crane_count', message: `Row ${rowNum}: crane_count must be at least 1 (got '${craneCountStr}')`, severity: 'error' });
    }

    const cranesAvail = parseInt(cranesAvailStr, 10);
    if (isNaN(cranesAvail) || cranesAvail < 0) {
      errors.push({ row: rowNum, column: 'cranes_available', message: `Row ${rowNum}: cranes_available cannot be negative (got '${cranesAvailStr}')`, severity: 'error' });
    } else if (cranesAvail > craneCount) {
      errors.push({ row: rowNum, column: 'cranes_available', message: `Row ${rowNum}: cranes_available (${cranesAvail}) cannot exceed total crane_count (${craneCount})`, severity: 'error' });
    }

    const craneUtil = parseFloat(craneUtilStr);
    if (isNaN(craneUtil) || craneUtil < 0 || craneUtil > 100) {
      errors.push({ row: rowNum, column: 'crane_utilization', message: `Row ${rowNum}: crane_utilization must be between 0 and 100% (got '${craneUtilStr}')`, severity: 'error' });
    }

    const waitHours = parseFloat(waitHoursStr);
    if (isNaN(waitHours) || waitHours < 0) {
      errors.push({ row: rowNum, column: 'waiting_time_hours', message: `Row ${rowNum}: waiting_time_hours cannot be negative (got '${waitHoursStr}')`, severity: 'error' });
    }

    const congestionScore = parseFloat(congestionScoreStr);
    if (isNaN(congestionScore) || congestionScore < 0 || congestionScore > 100) {
      errors.push({ row: rowNum, column: 'congestion_score', message: `Row ${rowNum}: congestion_score must be between 0 and 100 (got '${congestionScoreStr}')`, severity: 'error' });
    }

    // 4. ETD Transparent Handling
    let finalEstimatedEtd = estimatedEtdInput;
    let isEstimated = false;
    let etdRationale = 'Pre-calculated from operational telemetry';

    if (!actualEtd) {
      isEstimated = true;
      if (!finalEstimatedEtd) {
        const estCalc = calculateEstimatedEtd({
          arrivalTime,
          containerCount: containerCount || 5000,
          cranesAllocated: cranesAvail || 3,
          movesPerCranePerHour: 28,
          currentBerthQueue: 2,
          weatherCondition: weatherCond,
        });
        finalEstimatedEtd = estCalc.estimatedEtd;
        etdRationale = estCalc.rationale;
      } else {
        etdRationale = `Calculated turnaround based on container volume (${containerCount} TEU) and crane availability (${cranesAvail}/${craneCount}).`;
      }
    }

    // 5. Map status & priority
    let vesselStatus: VesselStatus = 'Loading';
    if (opStatusRaw.toLowerCase().includes('anchor')) vesselStatus = 'At Anchor';
    else if (opStatusRaw.toLowerCase().includes('arriv')) vesselStatus = 'Arriving';
    else if (opStatusRaw.toLowerCase().includes('await') || opStatusRaw.toLowerCase().includes('queue')) vesselStatus = 'At Anchor';
    else if (opStatusRaw.toLowerCase().includes('depart')) vesselStatus = 'Completed';
    else if (opStatusRaw.toLowerCase().includes('delay') || opStatusRaw.toLowerCase().includes('hold')) vesselStatus = 'Delayed';
    else if (opStatusRaw.toLowerCase().includes('berth')) vesselStatus = 'Berthing';
    else if (opStatusRaw.toLowerCase().includes('operat') || opStatusRaw.toLowerCase().includes('load')) vesselStatus = 'Loading';

    let priority: PriorityLevel = 'Standard';
    if (congestionScore > 80 || waitHours > 20) priority = 'Critical';
    else if (congestionScore > 65 || waitHours > 10) priority = 'Priority';

    // Map into application Vessel model
    const vessel: Vessel = {
      id: vesselId || `VES-${1000 + r}`,
      name: vesselName || `Vessel ${r}`,
      imo: `98${String(10000 + r).slice(-5)}`,
      flag: 'PA',
      lengthMeters: containerCount > 15000 ? 399 : containerCount > 8000 ? 366 : 220,
      draughtMeters: containerCount > 15000 ? 16.5 : 13.0,
      teuCapacity: containerCount || 5000,
      cargoVolume: containerCount || 5000,
      origin: port || 'Port of Rotterdam',
      destination: terminal || 'Maasvlakte 2',
      eta: arrivalTime,
      etd: actualEtd || '',
      estimatedEtd: finalEstimatedEtd,
      isEstimatedEtd: isEstimated,
      etdRationale: etdRationale,
      status: vesselStatus,
      priority: priority,
      currentBerth: vesselStatus === 'Berthing' || vesselStatus === 'Loading' ? berthId : null,
      assignedBerth: berthId,
      predictedWaitHours: waitHours || 2.5,
      demurrageRisk: congestionScore > 75 ? 'High' : congestionScore > 45 ? 'Medium' : 'Low',
      historicalTurnaroundHours: turnaroundHours || 24,
      vesselType: vesselType,
      containersLoaded: (containerCount || 5000) - (containersPending || 0),
      containersTotal: containerCount || 5000,
      timelineEvents: [
        { stage: 'Port Arrival', time: arrivalTime, status: 'completed' },
        {
          stage: 'Berth Fast',
          time: new Date(new Date(arrivalTime).getTime() + (waitHours || 2) * 3600000).toISOString(),
          status: vesselStatus === 'Berthing' || vesselStatus === 'Loading' ? 'current' : 'scheduled',
        },
        {
          stage: 'Departure',
          time: actualEtd || finalEstimatedEtd,
          status: 'scheduled',
        },
      ],
    };

    parsedVessels.push(vessel);

    // Accumulate berth state
    if (!berthMap[berthId]) {
      berthMap[berthId] = {
        utilizations: [],
        queueCount: 0,
        cranesAvailable: [],
        maxCranes: [],
        vesselIds: [],
      };
    }
    berthMap[berthId].utilizations.push(berthUtil || 70);
    berthMap[berthId].cranesAvailable.push(cranesAvail || 3);
    berthMap[berthId].maxCranes.push(craneCount || 5);
    berthMap[berthId].vesselIds.push(vessel.id);
    if (vessel.status === 'At Anchor' || vessel.status === 'Arriving') {
      berthMap[berthId].queueCount++;
    }
  }

  // Construct updated Berths based on imported records
  const reconstructedBerths: Berth[] = Object.keys(berthMap).map(bId => {
    const stats = berthMap[bId];
    const avgUtil = Math.round(stats.utilizations.reduce((a, b) => a + b, 0) / stats.utilizations.length);
    const avgAvailCranes = Math.round(stats.cranesAvailable.reduce((a, b) => a + b, 0) / stats.cranesAvailable.length);
    const maxCranes = Math.max(...stats.maxCranes, 4);

    let status: BerthStatus = 'Available';
    if (avgUtil >= 85) status = 'Congested';
    else if (stats.vesselIds.length > 0) status = 'Occupied';

    return {
      id: bId,
      name: `Berth ${bId} (${bId === 'B01' || bId === 'B02' ? 'North Basin' : bId === 'B03' || bId === 'B04' ? 'Central Quay' : 'South Extension'})`,
      lengthMeters: 450,
      depthMeters: 17.5,
      maxDraftMeters: 16.5,
      status: status,
      currentUtilization: avgUtil,
      predictedUtilization: Math.min(100, Math.round(avgUtil * 1.05)),
      queueCount: stats.queueCount,
      availableCranes: avgAvailCranes,
      maxCranes: maxCranes,
      currentVesselId: stats.vesselIds[0] || null,
      nextVesselId: stats.vesselIds[1] || null,
      assignedCraneIds: Array.from({ length: avgAvailCranes }, (_, i) => `CR-${bId}-${i + 1}`),
      hourlyForecast: [
        { hour: '+0h', utilization: avgUtil },
        { hour: '+12h', utilization: Math.min(100, Math.round(avgUtil * 1.04)) },
        { hour: '+24h', utilization: Math.min(100, Math.round(avgUtil * 1.08)) },
        { hour: '+48h', utilization: Math.min(100, Math.round(avgUtil * 1.02)) },
        { hour: '+72h', utilization: Math.max(40, Math.round(avgUtil * 0.95)) },
      ],
      riskLevel: avgUtil >= 85 ? 'HIGH' : avgUtil >= 70 ? 'MEDIUM' : 'LOW',
    };
  });

  return {
    isValid: errors.length === 0,
    totalRows: lines.length - 1,
    validRows: parsedVessels.length,
    errors,
    warnings,
    vessels: parsedVessels,
    berths: reconstructedBerths.length > 0 ? reconstructedBerths : undefined,
  };
}

/**
 * Fetch the bundled preloaded realistic demo dataset
 */
export async function fetchPreloadedDemoCsv(): Promise<string> {
  const response = await fetch('/port_operations_demo.csv');
  if (!response.ok) {
    throw new Error(`Failed to load preloaded demo CSV: ${response.statusText}`);
  }
  return await response.text();
}
