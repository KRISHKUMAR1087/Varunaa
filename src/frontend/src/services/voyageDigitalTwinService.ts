/**
 * VARUNA PORT DISRUPTION INTELLIGENCE
 * Vessel Voyage Digital Twin & Schedule Propagation Engine
 * 
 * Provides end-to-end voyage tracking, geographic nautical waypoints,
 * 11-stage port-call operational timelines, and downstream schedule propagation.
 */

import {
  DownstreamLegPropagation,
  PortCallTimelineStep,
  TrackedContainerShipment,
} from '../types/operations';

export interface NauticalWaypoint {
  name: string;
  lat: number;
  lng: number;
  passed: boolean;
  timestamp?: string;
  estimatedArrival?: string;
  speedKnots?: number;
  status: 'PAST' | 'CURRENT' | 'PLANNED';
  notes?: string;
}

export interface VesselVoyageTwin {
  vesselId: string;
  vesselName: string;
  imo: string;
  flag: string;
  callSign: string;
  vesselType: string;
  lengthMeters: number;
  draughtMeters: number;
  teuCapacity: number;
  currentVoyageNumber: string;
  originPort: { code: string; name: string; country: string };
  destinationPort: { code: string; name: string; country: string };
  currentLocation: {
    lat: number;
    lng: number;
    speedKnots: number;
    headingDegrees: number;
    navigationalStatus: 'Underway Using Engine' | 'At Anchor' | 'Moored Quayside' | 'Restricted Maneuverability';
    lastReportedTime: string;
  };
  waypoints: NauticalWaypoint[];
  currentCallTimeline: PortCallTimelineStep[];
  downstreamLegs: DownstreamLegPropagation[];
  trackedCargo: TrackedContainerShipment[];
  bunkerConsumptionMtPerDay: number;
  projectedFuelDeltaUsd: number;
  delayHoursAtCurrentPort: number;
  isSchedulePropagated: boolean;
}

export class VoyageDigitalTwinService {
  /**
   * Retrieves high-precision digital twin data for a vessel voyage
   */
  public static getVoyageTwin(vesselId: string = 'VES-01'): VesselVoyageTwin {
    // Flagship voyage: MV Ocean Star (ULCV 14,500 TEU, Asia-North Europe AE1 loop)
    const waypoints: NauticalWaypoint[] = [
      {
        name: 'Singapore Malacca Strait Transit',
        lat: 1.29,
        lng: 103.85,
        passed: true,
        timestamp: '2026-09-24T06:00:00Z',
        speedKnots: 18.2,
        status: 'PAST',
        notes: 'Cleared Singapore outer anchorage on schedule.',
      },
      {
        name: 'Suez Canal Convoy Entry (Port Said)',
        lat: 31.26,
        lng: 32.30,
        passed: true,
        timestamp: '2026-10-04T14:30:00Z',
        speedKnots: 12.0,
        status: 'PAST',
        notes: 'Northbound convoy transit completed without queue delay.',
      },
      {
        name: 'Strait of Gibraltar Transit',
        lat: 35.98,
        lng: -5.60,
        passed: true,
        timestamp: '2026-10-10T08:15:00Z',
        speedKnots: 17.5,
        status: 'PAST',
        notes: 'Entered North Atlantic waters. Swell 2.1m.',
      },
      {
        name: 'English Channel Traffic Separation Scheme (Dover Strait)',
        lat: 51.05,
        lng: 1.45,
        passed: true,
        timestamp: '2026-10-14T22:00:00Z',
        speedKnots: 16.4,
        status: 'PAST',
        notes: 'Channel pilotage radio contact established.',
      },
      {
        name: 'Port of Rotterdam (Maasvlakte Approach)',
        lat: 51.95,
        lng: 4.02,
        passed: false,
        timestamp: '2026-10-15T08:30:00Z',
        status: 'CURRENT',
        speedKnots: 0.0,
        notes: 'Currently berthed at Berth B04. Cargo discharge underway.',
      },
      {
        name: 'Antwerp Gateway (Deurganckdock)',
        lat: 51.28,
        lng: 4.28,
        passed: false,
        estimatedArrival: '2026-10-17T06:00:00Z',
        status: 'PLANNED',
        speedKnots: 15.0,
        notes: 'Downstream port call. Scheldt tidal window slot required.',
      },
      {
        name: 'Hamburg Container Terminal (Burchardkai)',
        lat: 53.53,
        lng: 9.94,
        passed: false,
        estimatedArrival: '2026-10-18T18:00:00Z',
        status: 'PLANNED',
        speedKnots: 16.5,
        notes: 'Final European discharge port on AE1 loop.',
      },
    ];

    const currentCallTimeline: PortCallTimelineStep[] = [
      {
        stage: '1_ESTIMATED_ARRIVAL',
        label: 'Filed Coastal Notice (ETA)',
        plannedTime: '2026-10-15T04:00:00Z',
        actualTime: '2026-10-15T04:00:00Z',
        status: 'COMPLETED',
        varianceMinutes: 0,
        durationMinutes: 0,
        description: 'Notice of arrival filed via PCS 72 hours prior.',
      },
      {
        stage: '2_ACTUAL_ARRIVAL',
        label: 'Pilot Station Boarding',
        plannedTime: '2026-10-15T04:00:00Z',
        actualTime: '2026-10-15T04:45:00Z',
        status: 'COMPLETED',
        varianceMinutes: 45,
        durationMinutes: 45,
        description: 'Pilot boarded at Maas Center Buoy.',
      },
      {
        stage: '3_ANCHORAGE_WAIT',
        label: 'Roadstead Anchorage Hold',
        plannedTime: '2026-10-15T04:45:00Z',
        actualTime: '2026-10-15T07:15:00Z',
        status: 'DISRUPTED',
        varianceMinutes: 150,
        durationMinutes: 150,
        description: 'Drifting at anchor for 2.5 hours awaiting B04 vacancy.',
      },
      {
        stage: '4_BERTH_ASSIGNMENT',
        label: 'All Lines Fast (Berth B04)',
        plannedTime: '2026-10-15T05:30:00Z',
        actualTime: '2026-10-15T08:30:00Z',
        status: 'COMPLETED',
        varianceMinutes: 180,
        durationMinutes: 60,
        description: 'Safely berthed with 16.5m depth at Quay 04.',
      },
      {
        stage: '5_CRANE_ALLOCATION',
        label: 'STS Cranes Positioned',
        plannedTime: '2026-10-15T06:30:00Z',
        actualTime: '2026-10-15T09:15:00Z',
        status: 'COMPLETED',
        varianceMinutes: 165,
        durationMinutes: 45,
        description: 'STS Cranes C03, C04 assigned to forward and mid bays.',
      },
      {
        stage: '6_OPERATIONS_PROGRESS',
        label: 'Discharge / Load Operations',
        plannedTime: '2026-10-15T07:00:00Z',
        actualTime: '2026-10-15T10:00:00Z',
        status: 'DISRUPTED',
        varianceMinutes: 240,
        durationMinutes: 720,
        description: 'At 11:30Z, Crane C03 suffered hoist inverter trip. 4,800 TEU remaining.',
      },
      {
        stage: '7_INTERRUPTION_RECOVERY',
        label: 'Adjacent Crane Recovery Action',
        plannedTime: '2026-10-15T12:00:00Z',
        actualTime: '2026-10-15T13:00:00Z',
        status: 'RECOVERED',
        varianceMinutes: 0,
        durationMinutes: 60,
        description: 'Adjacent STS Crane C02 mobilized along contiguous rail from Berth B02.',
      },
      {
        stage: '8_CARGO_COMPLETION',
        label: 'Last Bay Box Secured',
        plannedTime: '2026-10-16T12:00:00Z',
        revisedTime: '2026-10-16T16:30:00Z',
        status: 'SCHEDULED',
        varianceMinutes: 270,
        durationMinutes: 30,
        description: 'Expected completion of all 14,500 TEU container moves.',
      },
      {
        stage: '9_DEPARTURE_READINESS',
        label: 'Tug & Pilot Dispatch',
        plannedTime: '2026-10-16T12:30:00Z',
        revisedTime: '2026-10-16T17:00:00Z',
        status: 'SCHEDULED',
        varianceMinutes: 270,
        durationMinutes: 30,
        description: 'Harbor master unmooring clearance scheduled.',
      },
      {
        stage: '10_ACTUAL_DEPARTURE',
        label: 'Outward Unberthing',
        plannedTime: '2026-10-16T13:00:00Z',
        revisedTime: '2026-10-16T17:30:00Z',
        status: 'SCHEDULED',
        varianceMinutes: 270,
        durationMinutes: 45,
        description: 'Net port call delay: 4.5 hours with crane intervention applied.',
      },
      {
        stage: '11_DOWNSTREAM_PROPAGATION',
        label: 'Next Port Schedule Impact',
        plannedTime: '2026-10-17T02:00:00Z',
        revisedTime: '2026-10-17T06:30:00Z',
        status: 'DISRUPTED',
        varianceMinutes: 270,
        durationMinutes: 0,
        description: 'Propagated to Antwerp Gateway (BEANR): +4.5h delay. Transshipment connections notified.',
      },
    ];

    const downstreamLegs: DownstreamLegPropagation[] = [
      {
        portCode: 'BEANR',
        portName: 'Antwerp Gateway (Deurganckdock)',
        originalEta: '2026-10-17T02:00:00Z',
        propagatedEta: '2026-10-17T06:30:00Z',
        delayHours: 4.5,
        connectingShipmentsAtRisk: 86,
        transitSpeedKnots: 15.0,
        distanceNm: 68,
        isFeederCatchable: true,
        notes: 'Feeder Baltic can be held for 2 hours at Antwerp to catch transshipment boxes.',
      },
      {
        portCode: 'DEHAM',
        portName: 'Hamburg Terminal (Burchardkai)',
        originalEta: '2026-10-18T14:00:00Z',
        propagatedEta: '2026-10-18T17:30:00Z',
        delayHours: 3.5, // 1 hour recovered by steaming at 16.8 kts (+1.8 kts)
        connectingShipmentsAtRisk: 0,
        transitSpeedKnots: 16.8,
        distanceNm: 310,
        isFeederCatchable: true,
        notes: 'Steaming pace accelerated across German Bight to protect Elbe flood tide.',
      },
    ];

    const trackedCargo: TrackedContainerShipment[] = [
      {
        containerId: 'TGHU9283710',
        isoType: '40HC',
        vesselId,
        vesselName: 'MV Ocean Star',
        bookingRef: 'BKG-AE1-9921',
        consignee: 'Philips Healthcare MRI Logistics',
        commodity: 'Superconducting Cryo MRI Components',
        status: 'Discharging',
        dwellHours: 6,
        yardBlockId: 'CY-01 (High-Priority Bay 12)',
        customsCleared: true,
        inlandMode: 'Truck',
        transshipmentConnectingVessel: 'Feeder Baltic Express',
        transshipmentDeparture: '2026-10-17T14:00:00Z',
        isConnectionMissed: false,
        deliveryDeadlinesHoursLeft: 28,
      },
      {
        containerId: 'MSKU4829104',
        isoType: '40REEF',
        vesselId,
        vesselName: 'MV Ocean Star',
        bookingRef: 'BKG-AE1-8840',
        consignee: 'Greenyard Fresh Netherlands',
        commodity: 'Fresh Mangoes & Avocados (+4°C)',
        status: 'Yard Stack',
        dwellHours: 12,
        yardBlockId: 'CY-04 (Reefer Stacks)',
        customsCleared: true,
        inlandMode: 'Rail',
        isConnectionMissed: false,
        deliveryDeadlinesHoursLeft: 18,
      },
    ];

    return {
      vesselId,
      vesselName: 'MV Ocean Star',
      imo: '9811002',
      flag: 'Panama (PA)',
      callSign: '3E2911',
      vesselType: 'Container Ship (ULCV 14,500 TEU)',
      lengthMeters: 366,
      draughtMeters: 15.2,
      teuCapacity: 14500,
      currentVoyageNumber: 'VOY-2026-088W',
      originPort: { code: 'SGSIN', name: 'Port of Singapore', country: 'Singapore' },
      destinationPort: { code: 'NLRTM', name: 'Port of Rotterdam', country: 'Netherlands' },
      currentLocation: {
        lat: 51.95,
        lng: 4.02,
        speedKnots: 0.0,
        headingDegrees: 112,
        navigationalStatus: 'Moored Quayside',
        lastReportedTime: '2026-10-15T12:00:00Z',
      },
      waypoints,
      currentCallTimeline,
      downstreamLegs,
      trackedCargo,
      bunkerConsumptionMtPerDay: 84.5,
      projectedFuelDeltaUsd: 14200, // Speeding up to catch next port costs +$14.2k bunker fuel
      delayHoursAtCurrentPort: 4.5,
      isSchedulePropagated: true,
    };
  }

  /**
   * Recalculates downstream port arrival ETAs when a vessel departs late.
   */
  public static propagateDelay(
    originalDeparture: string,
    actualOrRevisedDeparture: string,
    legs: DownstreamLegPropagation[]
  ): DownstreamLegPropagation[] {
    const origMs = new Date(originalDeparture).getTime();
    const actualMs = new Date(actualOrRevisedDeparture).getTime();
    const delayMins = Math.max(0, Math.round((actualMs - origMs) / 60000));
    const delayHours = Number((delayMins / 60).toFixed(1));

    return legs.map((leg, idx) => {
      // Compound decay or recovery: vessels can recover ~0.8h per 200 NM by increasing speed
      const recoverableHours = Math.min(delayHours * 0.3, (leg.distanceNm / 200) * 0.8);
      const netLegDelayHours = Math.max(0, Number((delayHours - (idx > 0 ? recoverableHours : 0)).toFixed(1)));
      const origLegEtaMs = new Date(leg.originalEta).getTime();
      const newEta = new Date(origLegEtaMs + netLegDelayHours * 3600 * 1000).toISOString();

      return {
        ...leg,
        propagatedEta: newEta,
        delayHours: netLegDelayHours,
        isFeederCatchable: netLegDelayHours <= 6.0,
        connectingShipmentsAtRisk: netLegDelayHours > 6.0 ? Math.round(netLegDelayHours * 16) : 0,
        notes: netLegDelayHours > 6.0
          ? `CRITICAL: Connecting transshipments missed if departure is delayed past +${netLegDelayHours}h.`
          : `Manageable: Within port buffer window. Connecting feeders catchable.`,
      };
    });
  }
}
