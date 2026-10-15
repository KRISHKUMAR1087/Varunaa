/**
 * Varunaa AI - ETD Estimation & Turnaround Service
 *
 * Resolves the operational contradiction where users were previously forced
 * to supply a future departure time (ETD) before port berthing.
 *
 * Distinction:
 * - Actual ETD: Confirmed departure time provided by vessel operator/carrier.
 * - Estimated ETD: Calculated by the system from operational parameters:
 *   ETA, container volume, assigned crane moves/hr, berth queue, weather,
 *   and historical turnaround times.
 */

export interface EtdEstimationInput {
  eta: string;
  containerVolume?: number;
  assignedBerth?: string;
  berthUtilization?: number;
  queueCount?: number;
  cranesCount?: number;
  craneMovesPerHour?: number;
  weatherSeverity?: 'Calm' | 'Moderate' | 'Severe';
  historicalTurnaroundHours?: number;
}

export interface EtdEstimationResult {
  estimatedEtd: string;
  turnaroundHours: number;
  handlingHours: number;
  waitingHours: number;
  weatherFactor: number;
  rationale: string;
  isEstimated: boolean;
}

export class EtdEstimator {
  /**
   * Computes an operational estimated turnaround time and departure schedule.
   */
  public static estimateDeparture(input: EtdEstimationInput): EtdEstimationResult {
    const containers = Math.max(100, Number(input.containerVolume) || 1200);
    const cranes = Math.max(1, Math.min(6, Number(input.cranesCount) || 3));
    const movesPerHour = Math.max(15, Number(input.craneMovesPerHour) || 30);
    const queue = Math.max(0, Number(input.queueCount) || 0);

    // Weather impact multiplier on STS gantry crane cycles
    const weather = input.weatherSeverity || 'Calm';
    const weatherFactor = weather === 'Severe' ? 1.4 : weather === 'Moderate' ? 1.15 : 1.0;

    // 1. Quayside handling time (TEU volume divided by aggregate crane gang throughput)
    const effectiveGangMoves = cranes * movesPerHour;
    const handlingHours = Number((containers / effectiveGangMoves).toFixed(1));

    // 2. Anchorage / pilot station queue delay
    const waitingHours = Number((queue * 1.8).toFixed(1));

    // 3. Mooring, unmooring, and customs clearance buffer (1.5 hours standard)
    const bufferHours = 1.5;

    // 4. Total calculated turnaround
    const calculatedTurnaround = (handlingHours + waitingHours + bufferHours) * weatherFactor;
    const historical = Number(input.historicalTurnaroundHours) || 20;

    // Blend 75% operational model + 25% historical baseline for stabilization
    const turnaroundHours = Number((calculatedTurnaround * 0.75 + historical * 0.25).toFixed(1));

    // 5. Build human-readable Estimated ETD string
    const estimatedEtd = this.calculateDepartureString(input.eta, turnaroundHours);

    const rationale = `Calculated based on ${containers.toLocaleString()} TEU handled by ${cranes} STS cranes (${movesPerHour} moves/hr), ` +
      `${queue > 0 ? `${queue} waiting vessels in queue (+${waitingHours}h), ` : 'zero queue delay, '}` +
      `${weather !== 'Calm' ? `${weather.toLowerCase()} weather penalty (${Math.round((weatherFactor - 1) * 100)}%), ` : 'calm weather, '}` +
      `and historical turnaround benchmark (${historical}h).`;

    return {
      estimatedEtd,
      turnaroundHours,
      handlingHours,
      waitingHours,
      weatherFactor,
      rationale,
      isEstimated: true,
    };
  }

  /**
   * Projects departure string by offsetting ETA by turnaround hours.
   */
  public static calculateDepartureString(etaStr: string, turnaroundHours: number): string {
    const raw = (etaStr || '').trim();

    // Check if ETA is a standard parseable ISO or datetime string
    const parsedDate = Date.parse(raw);
    if (!isNaN(parsedDate)) {
      const departure = new Date(parsedDate + turnaroundHours * 3600 * 1000);
      return departure.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    }

    // Handle relative patterns like "Today, 14:30 UTC" or "Tomorrow, 08:00 UTC"
    const daysToAdd = Math.floor(turnaroundHours / 24);
    const remainingHours = Math.round(turnaroundHours % 24);

    if (raw.toLowerCase().includes('today')) {
      if (turnaroundHours <= 12) {
        return `Today, +${Math.round(turnaroundHours)}h UTC (Est.)`;
      } else if (turnaroundHours <= 36) {
        return `Tomorrow, +${remainingHours}h UTC (Est.)`;
      } else {
        return `+${daysToAdd + 1} Days (Est.)`;
      }
    }

    if (raw.toLowerCase().includes('tomorrow')) {
      const targetDays = daysToAdd + 1;
      return `+${targetDays} Days, ${remainingHours}:00 UTC (Est.)`;
    }

    if (raw.includes('+')) {
      const match = raw.match(/\+(\d+)\s*Days?/i);
      const baseDays = match ? parseInt(match[1], 10) : 1;
      return `+${baseDays + Math.max(1, daysToAdd)} Days (Est.)`;
    }

    // Default fallback
    return `+${Math.max(1, Math.ceil(turnaroundHours / 24))} Days, ${Math.round(turnaroundHours)}h turnaround (Est.)`;
  }
}

export function calculateEstimatedEtd(input: {
  arrivalTime: string;
  containerCount: number;
  cranesAllocated: number;
  movesPerCranePerHour?: number;
  currentBerthQueue?: number;
  weatherCondition?: string;
}): { estimatedEtd: string; turnaroundHours: number; rationale: string } {
  const weatherSeverity =
    input.weatherCondition?.toLowerCase().includes('storm') ||
    input.weatherCondition?.toLowerCase().includes('gale')
      ? 'Severe'
      : input.weatherCondition?.toLowerCase().includes('fog') ||
        input.weatherCondition?.toLowerCase().includes('wind')
      ? 'Moderate'
      : 'Calm';

  const res = EtdEstimator.estimateDeparture({
    eta: input.arrivalTime,
    containerVolume: input.containerCount,
    cranesCount: input.cranesAllocated,
    craneMovesPerHour: input.movesPerCranePerHour || 28,
    queueCount: input.currentBerthQueue || 0,
    weatherSeverity,
  });

  return {
    estimatedEtd: res.estimatedEtd,
    turnaroundHours: res.turnaroundHours,
    rationale: res.rationale,
  };
}
