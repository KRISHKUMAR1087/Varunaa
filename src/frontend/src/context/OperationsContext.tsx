import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from "react";
import {
  Vessel,
  Berth,
  Crane,
  YardBlock,
  CongestionForecastData,
  OptimizationResult,
  SimulationResult,
  RouteOption,
  ShiftPlanItem,
  OperationalAlert,
  CopilotMessage,
  BerthRequest,
  BerthRequestStatus,
  ShippingDocument,
  DocumentType,
} from "../types/operations";
import {
  initialVessels,
  initialBerths,
  initialCranes,
  initialYardBlocks,
  initialForecastData,
  initialOptimizationResult,
  initialSimulationResult,
  initialRouteOptions,
  initialShiftPlans,
  initialAlerts,
  initialBerthRequests,
  initialShippingDocuments,
} from "../services/mockData";
import { geminiCopilotService } from "../services/geminiCopilotService";
import { useAuth } from "./AuthContext";
import { DocumentService } from "../services/documentService";
import { NotificationService } from "../services/notificationService";
import { OperationsDataService } from "../services/operationsDataService";

export interface ToastState {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
}

interface OperationsContextType {
  vessels: Vessel[];
  berths: Berth[];
  cranes: Crane[];
  yardBlocks: YardBlock[];
  forecast: CongestionForecastData | null;
  optimization: OptimizationResult | null;
  simulation: SimulationResult | null;
  routes: RouteOption[];
  setRoutes: React.Dispatch<React.SetStateAction<RouteOption[]>>;
  shiftPlans: ShiftPlanItem[];
  alerts: OperationalAlert[];
  berthRequests: BerthRequest[];
  shippingDocuments: ShippingDocument[];

  // State flags
  isOptimizationApplied: boolean;
  isRecoveryPlanApplied: boolean;
  isSimulating: boolean;

  // UI state
  isCopilotOpen: boolean;
  setIsCopilotOpen: (open: boolean) => void;
  copilotMessages: CopilotMessage[];
  isCopilotLoading: boolean;
  toast: ToastState | null;
  clearToast: () => void;
  showToast: (
    type: "success" | "warning" | "error" | "info",
    title: string,
    message: string,
  ) => void;

  // Operational Actions
  applyOptimization: () => void;
  runSimulation: (scenarioType?: string, duration?: number) => Promise<void>;
  applyRecoveryPlan: () => void;
  reassignVesselBerth: (vesselId: string, targetBerthId: string) => void;
  resolveAlert: (alertId: string) => void;
  sendCopilotMessage: (query: string) => Promise<void>;
  resetToDefault: () => void;
  importCsvData: (importedVessels: Vessel[], customBerths?: Berth[]) => void;
  redistributeYardBlock: (sourceId: string, targetId: string, amountTeu: number) => void;

  // Ship Agent Operational Methods
  addVessel: (vesselData: Partial<Vessel>) => Vessel;
  updateVessel: (id: string, updates: Partial<Vessel>) => void;
  deleteVessel: (id: string) => void;
  updateVesselEta: (vesselId: string, newEta: string, reason: string) => void;
  submitBerthRequest: (
    request: Omit<BerthRequest, "id" | "submittedAt" | "status">,
  ) => void;
  updateBerthRequestStatus: (
    requestId: string,
    status: BerthRequestStatus,
    assignedBerth?: string,
  ) => void;
  updateCargoInfo: (
    vesselId: string,
    cargoData: {
      containersLoaded?: number;
      containersTotal?: number;
      cargoQuantity?: string;
      dangerousGoods?: boolean;
      specialNotes?: string;
    },
  ) => void;
  uploadDocument: (doc: {
    file?: File;
    name: string;
    vesselId: string;
    vesselName: string;
    type: DocumentType;
    fileSize?: string;
    ownerId?: string;
  }) => Promise<ShippingDocument>;
  deleteDocument: (docId: string) => Promise<void>;

  // Persistent Notification Read State
  readNotificationIds: Set<string>;
  isNotificationRead: (id: string) => boolean;
  toggleNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (ids?: string[]) => Promise<void>;
  unreadAgentAlertsCount: number;

  // Selected Entities
  selectedBerthId: string;
  setSelectedBerthId: (id: string) => void;
  selectedVesselId: string;
  setSelectedVesselId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const OperationsContext = createContext<OperationsContextType | undefined>(
  undefined,
);

export const OperationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [berths, setBerths] = useState<Berth[]>([]);
  const [cranes, setCranes] = useState<Crane[]>([]);
  const [yardBlocks, setYardBlocks] = useState<YardBlock[]>([]);
  const [forecast, setForecast] = useState<CongestionForecastData | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(
    null,
  );
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [shiftPlans, setShiftPlans] = useState<ShiftPlanItem[]>([]);
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [berthRequests, setBerthRequests] = useState<BerthRequest[]>([]);
  const [shippingDocuments, setShippingDocuments] = useState<
    ShippingDocument[]
  >([]);
  const { user, isDemoUser } = useAuth();

  const syncVesselIfReal = (vessel: Vessel) => {
    if (!isDemoUser) {
      void OperationsDataService.upsertVessel(vessel);
    }
  };

  const syncBerthRequestIfReal = (request: BerthRequest) => {
    if (!isDemoUser) {
      void OperationsDataService.upsertBerthRequest(request);
    }
  };

  // Persistent Notification Read State
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(
    new Set(),
  );

  // Hydrate demo data or user-owned operational data from Supabase.
  useEffect(() => {
    let isMounted = true;

    const syncOperations = async () => {
      if (!user) {
        setVessels([]);
        setBerthRequests([]);
        setShippingDocuments([]);
        setBerths([]);
        setCranes([]);
        setYardBlocks([]);
        setForecast(null);
        setOptimization(null);
        setSimulation(null);
        setRoutes([]);
        setShiftPlans([]);
        setAlerts([]);
        return;
      }

      if (isDemoUser) {
        setVessels(initialVessels);
        setBerthRequests(initialBerthRequests);
        setShippingDocuments(initialShippingDocuments);
        setBerths(initialBerths);
        setCranes(initialCranes);
        setYardBlocks(initialYardBlocks);
        setForecast(initialForecastData);
        setOptimization(initialOptimizationResult);
        setSimulation(initialSimulationResult);
        setRoutes(initialRouteOptions);
        setShiftPlans(initialShiftPlans);
        setAlerts(initialAlerts);
        return;
      }

      try {
        const [
          dbVessels,
          dbRequests,
          dbBerths,
          dbCranes,
          dbYard,
          dbAlerts,
          dbShiftPlans,
          dbRoutes,
          dbForecast,
          dbOptimization,
          dbSimulation,
        ] = await Promise.all([
          OperationsDataService.fetchVessels(user.id, user.role),
          OperationsDataService.fetchBerthRequests(user.id, user.role),
          OperationsDataService.fetchBerths(),
          OperationsDataService.fetchCranes(),
          OperationsDataService.fetchYardBlocks(),
          OperationsDataService.fetchAlerts(user.id, user.role),
          OperationsDataService.fetchShiftPlans(user.id, user.role),
          OperationsDataService.fetchRoutes(user.id, user.role),
          OperationsDataService.fetchForecast(user.id, user.role),
          OperationsDataService.fetchOptimization(user.id, user.role),
          OperationsDataService.fetchSimulation(user.id, user.role),
        ]);

        if (!isMounted) return;
        setVessels(dbVessels);
        setBerthRequests(dbRequests);
        setShippingDocuments([]);
        setBerths(dbBerths);
        setCranes(dbCranes);
        setYardBlocks(dbYard);
        setAlerts(dbAlerts);
        setShiftPlans(dbShiftPlans);
        setRoutes(dbRoutes);
        setForecast(dbForecast);
        setOptimization(dbOptimization);
        setSimulation(dbSimulation);
      } catch (e) {
        console.warn(
          "[OperationsContext] Failed to load operations from Supabase:",
          e,
        );
        if (isMounted) {
          setVessels([]);
          setBerthRequests([]);
          setShippingDocuments([]);
          setBerths([]);
          setCranes([]);
          setYardBlocks([]);
          setForecast(null);
          setOptimization(null);
          setSimulation(null);
          setRoutes([]);
          setShiftPlans([]);
          setAlerts([]);
        }
      }
    };

    syncOperations();
    return () => {
      isMounted = false;
    };
  }, [user, isDemoUser]);

  // Hydrate user documents from Supabase
  useEffect(() => {
    let isMounted = true;
    const syncDocs = async () => {
      if (isDemoUser) return;
      if (user?.id) {
        try {
          const dbDocs = await DocumentService.fetchDocuments(
            user.id,
            user.role,
          );
          if (isMounted) {
            setShippingDocuments(dbDocs);
          }
        } catch (e) {
          console.warn(
            "[OperationsContext] Failed to load documents from Supabase:",
            e,
          );
        }
      }
    };
    syncDocs();
    return () => {
      isMounted = false;
    };
  }, [user, isDemoUser]);

  // Hydrate user notification read receipts from Supabase
  useEffect(() => {
    let isMounted = true;
    const syncReads = async () => {
      if (user?.id) {
        try {
          const reads = await NotificationService.fetchUserReadIds(user.id);
          if (isMounted) setReadNotificationIds(reads);
        } catch (e) {
          console.warn(
            "[OperationsContext] Failed to load notification reads from Supabase:",
            e,
          );
        }
      } else {
        if (isMounted) setReadNotificationIds(new Set());
      }
    };
    syncReads();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const isNotificationRead = (id: string): boolean => {
    return readNotificationIds.has(id);
  };

  const toggleNotificationRead = async (id: string): Promise<void> => {
    const userId = user?.id || "demo-agent";
    const wasRead = readNotificationIds.has(id);

    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      if (wasRead) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    try {
      if (wasRead) {
        await NotificationService.markAsUnread(userId, id);
      } else {
        await NotificationService.markAsRead(userId, id);
      }
    } catch (e) {
      console.warn(
        "[OperationsContext] toggleNotificationRead sync warning:",
        e,
      );
    }
  };

  const markAllNotificationsRead = async (ids?: string[]): Promise<void> => {
    const userId = user?.id || "demo-agent";
    const targetIds =
      ids && ids.length > 0
        ? ids
        : [
            "ALT-AG-01",
            "ALT-AG-02",
            "ALT-AG-03",
            "ALT-AG-04",
            ...alerts.map((a) => a.id),
          ];

    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      targetIds.forEach((id) => next.add(id));
      return next;
    });

    try {
      await NotificationService.markAllAsRead(userId, targetIds);
      showToast(
        "info",
        "Notifications Marked as Read",
        "All advisories marked as read.",
      );
    } catch (e) {
      console.warn(
        "[OperationsContext] markAllNotificationsRead sync warning:",
        e,
      );
    }
  };

  const agentAlertIds = ["ALT-AG-01", "ALT-AG-02", "ALT-AG-03", "ALT-AG-04"];
  const unreadAgentAlertsCount = agentAlertIds.filter(
    (id) => !readNotificationIds.has(id),
  ).length;

  const [isOptimizationApplied, setIsOptimizationApplied] =
    useState<boolean>(false);
  const [isRecoveryPlanApplied, setIsRecoveryPlanApplied] =
    useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [isCopilotLoading, setIsCopilotLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [selectedBerthId, setSelectedBerthId] = useState<string>("B04");
  const [selectedVesselId, setSelectedVesselId] = useState<string>("VES-01");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([
    {
      id: "init-1",
      sender: "gemini",
      text: `Good day, Supervisor. I am your **PortsPilot Copilot**. 

I am monitoring real-time AIS feeds, tidal windows, crane telemetry, and predictive bottlenecks across all 6 berths. 

**Current Alert Highlight:** Berth **B04** is projected to reach **94% saturation within 24 hours** due to incoming ULCV bunching and STS C03 downtime. How would you like to proceed?`,
      timestamp: "Just now",
      suggestedActions: [
        { label: "Why is B04 at risk?", prompt: "Why is B04 at risk?" },
        {
          label: "What happens if C03 fails?",
          prompt: "What happens if C03 fails for 8 hours?",
        },
        { label: "Optimize Operations", actionRoute: "/decision/optimizer" },
      ],
    },
  ]);

  const showToast = (
    type: "success" | "warning" | "error" | "info",
    title: string,
    message: string,
  ) => {
    const id = "toast-" + Date.now();
    setToast({ id, type, title, message });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4500);
  };

  const clearToast = () => setToast(null);

  // Apply Optimization Recommendation
  const applyOptimization = () => {
    setIsOptimizationApplied(true);
    setOptimization((prev) => (prev ? { ...prev, isApplied: true } : null));

    setVessels((prev) =>
      prev.map((v) => {
        if (v.id === "VES-01") {
          return {
            ...v,
            assignedBerth: "B02",
            predictedWaitHours: 6.8,
            demurrageRisk: "Low",
            recommendedAction:
              "Optimized: Assigned to B02 with 4 STS cranes (Wait reduced to 6.8h).",
          };
        }
        return v;
      }),
    );

    setBerths((prev) =>
      prev.map((b) => {
        if (b.id === "B04") {
          return {
            ...b,
            status: "Occupied",
            currentUtilization: 76,
            predictedUtilization: 78,
            queueCount: 4,
            riskLevel: "LOW",
            nextVesselId: null,
          };
        }
        if (b.id === "B02") {
          return {
            ...b,
            predictedUtilization: 74,
            queueCount: 3,
            nextVesselId: "VES-01",
          };
        }
        return b;
      }),
    );

    setForecast((prev) =>
      prev
        ? {
            ...prev,
            overallCongestionPercent: 68,
            points: prev.points.map((p) => ({
              ...p,
              B04: Math.max(68, p.B04 - 16),
              B02: Math.min(80, p.B02 + 6),
            })),
          }
        : null,
    );

    setShiftPlans((prev) =>
      prev.map((sp) => {
        if (sp.vesselId === "VES-01") {
          return {
            ...sp,
            berthId: "B02",
            status: "Optimized",
            assignedCranes: ["C04", "C06"],
            conflictReason: undefined,
          };
        }
        return sp;
      }),
    );

    setBerthRequests((prev) =>
      prev.map((r) => {
        if (r.vesselId === "VES-01") {
          return {
            ...r,
            status: "Changed",
            assignedBerth: "B02",
            reviewedAt: "Just now",
            notes:
              "Optimized by Port Operations: Reallocated to Berth B02 with 4 STS cranes (Wait reduced to 6.8h).",
          };
        }
        return r;
      }),
    );

    showToast(
      "success",
      "Optimization Applied Successfully",
      "Ocean Star reassigned to Berth B02. Expected wait decreased from 11.4h to 6.8h.",
    );
  };

  // Run What-If Simulation
  const runSimulation = async (
    scenarioType = "crane_failure",
    duration = 8,
  ) => {
    setIsSimulating(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    setSimulation((prev) =>
      prev
        ? {
            ...prev,
            scenario: {
              ...prev.scenario,
              durationHours: duration,
              type: scenarioType as
                | "crane_failure"
                | "berth_closure"
                | "vessel_surge"
                | "vessel_delay"
                | "yard_capacity_reduction",
            },
            after: {
              queueCount: 11,
              avgWaitHours: 17.8,
              berthUtilizationPercent: 94,
            },
          }
        : null,
    );

    setIsSimulating(false);
    showToast(
      "warning",
      "Simulation Complete",
      `Projected disruption: Queue increases from 7 to 11 vessels, wait escalates to 17.8h.`,
    );
  };

  // Apply AI Recovery Plan
  const applyRecoveryPlan = () => {
    setIsRecoveryPlanApplied(true);
    setSimulation((prev) =>
      prev
        ? {
            ...prev,
            recoveryPlan: {
              ...prev.recoveryPlan,
              isApplied: true,
            },
          }
        : null,
    );

    setCranes((prev) =>
      prev.map((c) => {
        if (c.id === "C05") {
          return {
            ...c,
            berthId: "B04",
            status: "ACTIVE",
            movesPerHour: 30,
            utilizationPercent: 85,
          };
        }
        return c;
      }),
    );

    setVessels((prev) =>
      prev.map((v) => {
        if (v.id === "VES-01") {
          return {
            ...v,
            assignedBerth: "B02",
            predictedWaitHours: 6.8,
            demurrageRisk: "Low",
          };
        }
        if (v.id === "VES-05") {
          return {
            ...v,
            eta: "Tomorrow, 20:45 UTC (+4h buffer)",
            predictedWaitHours: 4.2,
          };
        }
        return v;
      }),
    );

    setBerths((prev) =>
      prev.map((b) => {
        if (b.id === "B04") {
          return {
            ...b,
            availableCranes: 2,
            assignedCraneIds: ["C05"],
            currentUtilization: 74,
            predictedUtilization: 76,
            queueCount: 4,
            riskLevel: "LOW",
          };
        }
        if (b.id === "B02") {
          return {
            ...b,
            availableCranes: 4,
            assignedCraneIds: ["C01", "C02", "C04", "C06"],
            predictedUtilization: 78,
          };
        }
        return b;
      }),
    );

    showToast(
      "success",
      "Recovery Plan Executed",
      "C05 transferred to B04. Ocean Star diverted to B02 with 4 STS cranes.",
    );
  };

  // Manual Berth Reassignment
  const reassignVesselBerth = (vesselId: string, targetBerthId: string) => {
    setVessels((prev) =>
      prev.map((v) => {
        if (v.id === vesselId) {
          return {
            ...v,
            assignedBerth: targetBerthId,
            predictedWaitHours: Math.max(
              1.5,
              Number((v.predictedWaitHours * 0.7).toFixed(1)),
            ),
            demurrageRisk: "Low",
          };
        }
        return v;
      }),
    );

    setBerthRequests((prev) =>
      prev.map((r) => {
        if (r.vesselId === vesselId) {
          return {
            ...r,
            status: "Approved",
            assignedBerth: targetBerthId,
            reviewedAt: "Just now",
          };
        }
        return r;
      }),
    );

    showToast(
      "info",
      "Berth Reassignment Complete",
      `Vessel reallocated to ${targetBerthId}.`,
    );
  };

  // Resolve Alert
  const resolveAlert = async (alertId: string) => {
    const updatedAlert = alerts.find((a) => a.id === alertId);
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isResolved: true } : a)),
    );
    if (!isDemoUser && updatedAlert && user?.id) {
      void OperationsDataService.upsertAlert(
        { ...updatedAlert, isResolved: true },
        user.id,
      );
    }
    if (user?.id) {
      await NotificationService.markAsRead(user.id, alertId);
      setReadNotificationIds((prev) => new Set(prev).add(alertId));
    }
    showToast(
      "info",
      "Alert Resolved",
      "Incident marked as resolved in system log.",
    );
  };

  // ==========================================
  // SHIP AGENT OPERATIONAL METHODS
  // ==========================================

  const addVessel = (vesselData: Partial<Vessel>): Vessel => {
    const newId = `VES-${String(vessels.length + 1).padStart(2, "0")}`;
    const newVessel: Vessel = {
      id: newId,
      name: vesselData.name || "New Carrier",
      imo:
        vesselData.imo || String(Math.floor(1000000 + Math.random() * 9000000)),
      flag: vesselData.flag || "Panama",
      lengthMeters: Number(vesselData.lengthMeters) || 300,
      draughtMeters: Number(vesselData.draughtMeters) || 14,
      teuCapacity: Number(vesselData.teuCapacity) || 12000,
      cargoVolume: Number(vesselData.cargoVolume) || 8000,
      origin: vesselData.origin || "Singapore (SGSIN)",
      destination: vesselData.destination || "Rotterdam (NLRTM)",
      eta: vesselData.eta || "Tomorrow, 12:00 UTC",
      etd: vesselData.etd || vesselData.estimatedEtd || "+2 Days, 18:00 UTC (Est.)",
      estimatedEtd: vesselData.estimatedEtd,
      isEstimatedEtd: vesselData.isEstimatedEtd ?? (!vesselData.etd || vesselData.etd.includes('(Est.)')),
      etdRationale: vesselData.etdRationale,
      status: vesselData.status || "Arriving",
      priority: vesselData.priority || "Standard",
      currentBerth: null,
      assignedBerth: vesselData.assignedBerth || "Unassigned",
      predictedWaitHours: Number(vesselData.predictedWaitHours) || 3.5,
      demurrageRisk: vesselData.demurrageRisk || "Low",
      historicalTurnaroundHours: Number(vesselData.historicalTurnaroundHours) || 20,
      recommendedAction: "Awaiting port berth assignment and pilot scheduling.",
      ownerId: vesselData.ownerId || user?.id || "demo-agent",
      shippingCompany: vesselData.shippingCompany || "Apex Maritime Agency",
      callSign:
        vesselData.callSign || "CALL-" + Math.floor(100 + Math.random() * 900),
      vesselType: vesselData.vesselType || "Container Ship",
      voyageNumber:
        vesselData.voyageNumber ||
        "VYG-" + Math.floor(1000 + Math.random() * 9000),
      previousPort: vesselData.previousPort || "Busan (KRPUS)",
      nextPort: vesselData.nextPort || "Hamburg (DEHAM)",
      requestedBerth: vesselData.requestedBerth || "B03",
      requestedArrivalTime:
        vesselData.requestedArrivalTime ||
        vesselData.eta ||
        "Tomorrow, 12:00 UTC",
      berthDurationHours: Number(vesselData.berthDurationHours) || 20,
      requestedCranes: Number(vesselData.requestedCranes) || 3,
      cargoType: vesselData.cargoType || "General Cargo & Containers",
      cargoQuantity: vesselData.cargoQuantity || "850 TEU Discharged",
      containersLoaded: Number(vesselData.containersLoaded) || 0,
      containersTotal: Number(vesselData.containersTotal) || 850,
      dangerousGoods: Boolean(vesselData.dangerousGoods),
      specialNotes: vesselData.specialNotes || "",
      timelineEvents: [
        { stage: "Port Notice Filed", time: "Just now", status: "completed" },
        {
          stage: "Pilot Station Entry",
          time: vesselData.eta || "Tomorrow 12:00 UTC",
          status: "scheduled",
        },
        { stage: "Berthing", time: "+1h after pilot", status: "scheduled" },
        {
          stage: "Discharge Ops",
          time: "+2h after berthing",
          status: "scheduled",
        },
      ],
    };

    setVessels((prev) => [newVessel, ...prev]);
    syncVesselIfReal(newVessel);

    if (vesselData.requestedBerth) {
      const newReq: BerthRequest = {
        id: `BR-${String(berthRequests.length + 1).padStart(2, "0")}`,
        vesselId: newId,
        vesselName: newVessel.name,
        imo: newVessel.imo,
        requestedBerth: vesselData.requestedBerth,
        requestedArrivalTime: newVessel.requestedArrivalTime || newVessel.eta,
        estimatedDurationHours: newVessel.berthDurationHours || 20,
        requestedCranes: newVessel.requestedCranes || 3,
        cargoType: newVessel.cargoType || "Containerized Cargo",
        status: "Pending",
        submittedAt: "Just now",
        notes: newVessel.specialNotes,
        ownerId: newVessel.ownerId || "demo-agent",
      };
      setBerthRequests((prev) => [newReq, ...prev]);
      syncBerthRequestIfReal(newReq);
    }

    showToast(
      "success",
      "Vessel Added Successfully",
      `${newVessel.name} (IMO ${newVessel.imo}) registered in your fleet.`,
    );
    return newVessel;
  };

  const updateVessel = (id: string, updates: Partial<Vessel>) => {
    let updatedVessel: Vessel | undefined;
    setVessels((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        updatedVessel = { ...v, ...updates };
        return updatedVessel;
      }),
    );
    if (updatedVessel) syncVesselIfReal(updatedVessel);
    showToast("info", "Vessel Updated", `Changes saved for vessel.`);
  };

  const deleteVessel = (id: string) => {
    setVessels((prev) => prev.filter((v) => v.id !== id));
    if (!isDemoUser) {
      void OperationsDataService.deleteVessel(id);
    }
    showToast(
      "info",
      "Vessel Removed",
      `Vessel archived from your active fleet.`,
    );
  };

  const updateVesselEta = (
    vesselId: string,
    newEta: string,
    reason: string,
  ) => {
    let updatedVessel: Vessel | undefined;
    setVessels((prev) =>
      prev.map((v) => {
        if (v.id === vesselId) {
          updatedVessel = {
            ...v,
            eta: newEta,
            timelineEvents: v.timelineEvents.map((e) =>
              e.stage === "Anchorage Waiting" ||
              e.stage === "Pilot Station Entry"
                ? { ...e, time: newEta }
                : e,
            ),
          };
          return updatedVessel;
        }
        return v;
      }),
    );
    if (updatedVessel) syncVesselIfReal(updatedVessel);

    const vessel = vessels.find((v) => v.id === vesselId);
    const vesselName = vessel ? vessel.name : "Vessel";

    const newAlert: OperationalAlert = {
      id: `ALT-ETA-${Date.now()}`,
      timestamp: "Just now",
      severity: "MEDIUM",
      title: `${vesselName} ETA Changed (${reason})`,
      description: `Ship agent updated ETA for ${vesselName} to ${newEta}. Reason: ${reason}. Port congestion forecast may recalculate.`,
      relatedEntity: { type: "vessel", id: vesselId, name: vesselName },
      isResolved: false,
      actionRoute: `/operations/vessels/${vesselId}`,
      actionLabel: "Inspect Vessel",
    };
    setAlerts((prev) => [newAlert, ...prev]);
    if (!isDemoUser && user?.id) {
      void OperationsDataService.upsertAlert(newAlert, user.id);
    }

    showToast(
      "success",
      "ETA Updated Successfully",
      `${vesselName} ETA updated to ${newEta}. Port operations notified.`,
    );
  };

  const submitBerthRequest = (
    request: Omit<BerthRequest, "id" | "submittedAt" | "status">,
  ) => {
    const newRequest: BerthRequest = {
      ...request,
      id: `BR-${String(berthRequests.length + 1).padStart(2, "0")}`,
      status: "Pending",
      submittedAt: "Just now",
    };
    setBerthRequests((prev) => [newRequest, ...prev]);
    syncBerthRequestIfReal(newRequest);

    const newAlert: OperationalAlert = {
      id: `ALT-BR-${Date.now()}`,
      timestamp: "Just now",
      severity: "INFO",
      title: `New Berth Request: ${request.vesselName}`,
      description: `Ship agent requested Berth ${request.requestedBerth} (${request.requestedCranes} cranes) for ${request.vesselName} at ${request.requestedArrivalTime}.`,
      relatedEntity: {
        type: "berth",
        id: request.requestedBerth,
        name: `Berth ${request.requestedBerth}`,
      },
      isResolved: false,
      actionRoute: "/operations/berths",
      actionLabel: "Review Request",
    };
    setAlerts((prev) => [newAlert, ...prev]);
    if (!isDemoUser && user?.id) {
      void OperationsDataService.upsertAlert(newAlert, user.id);
    }

    showToast(
      "success",
      "Berth Request Submitted",
      `Request for ${request.requestedBerth} filed. Status: Pending Review.`,
    );
  };

  const updateBerthRequestStatus = (
    requestId: string,
    status: BerthRequestStatus,
    assignedBerth?: string,
  ) => {
    let updatedRequest: BerthRequest | undefined;
    setBerthRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          updatedRequest = {
            ...r,
            status,
            assignedBerth: assignedBerth || r.assignedBerth || r.requestedBerth,
            reviewedAt: "Just now",
          };
          return updatedRequest;
        }
        return r;
      }),
    );
    if (updatedRequest) syncBerthRequestIfReal(updatedRequest);

    const req = berthRequests.find((r) => r.id === requestId);
    if (req && assignedBerth) {
      setVessels((prev) =>
        prev.map((v) => (v.id === req.vesselId ? { ...v, assignedBerth } : v)),
      );
    }

    showToast(
      "info",
      "Berth Request Updated",
      `Request status changed to ${status}.`,
    );
  };

  const updateCargoInfo = (
    vesselId: string,
    cargoData: {
      containersLoaded?: number;
      containersTotal?: number;
      cargoQuantity?: string;
      dangerousGoods?: boolean;
      specialNotes?: string;
    },
  ) => {
    let updatedVessel: Vessel | undefined;
    setVessels((prev) =>
      prev.map((v) => {
        if (v.id === vesselId) {
          updatedVessel = {
            ...v,
            ...(cargoData.containersLoaded !== undefined
              ? { containersLoaded: cargoData.containersLoaded }
              : {}),
            ...(cargoData.containersTotal !== undefined
              ? { containersTotal: cargoData.containersTotal }
              : {}),
            ...(cargoData.cargoQuantity !== undefined
              ? { cargoQuantity: cargoData.cargoQuantity }
              : {}),
            ...(cargoData.dangerousGoods !== undefined
              ? { dangerousGoods: cargoData.dangerousGoods }
              : {}),
            ...(cargoData.specialNotes !== undefined
              ? { specialNotes: cargoData.specialNotes }
              : {}),
          };
          return updatedVessel;
        }
        return v;
      }),
    );
    if (updatedVessel) syncVesselIfReal(updatedVessel);
    showToast(
      "success",
      "Cargo Information Updated",
      "Manifest details and container handling stats saved.",
    );
  };

  const uploadDocument = async (doc: {
    file?: File;
    name: string;
    vesselId: string;
    vesselName: string;
    type: DocumentType;
    fileSize?: string;
    ownerId?: string;
  }): Promise<ShippingDocument> => {
    const effectiveOwnerId = doc.ownerId || user?.id || "demo-agent";

    if (doc.file) {
      try {
        const savedDoc = await DocumentService.uploadDocument({
          file: doc.file,
          name: doc.name,
          vesselId: doc.vesselId,
          vesselName: doc.vesselName,
          type: doc.type,
          ownerId: effectiveOwnerId,
        });

        setShippingDocuments((prev) => [savedDoc, ...prev]);
        showToast(
          "success",
          "Document Uploaded Successfully",
          `${savedDoc.name} verified and submitted for clearance.`,
        );
        return savedDoc;
      } catch (err: any) {
        showToast(
          "error",
          "Document Upload Failed",
          err.message || "Failed to upload document file.",
        );
        throw err;
      }
    }

    const newDoc: ShippingDocument = {
      id: `DOC-${String(shippingDocuments.length + 1).padStart(2, "0")}`,
      name: doc.name,
      vesselId: doc.vesselId,
      vesselName: doc.vesselName,
      type: doc.type,
      fileSize: doc.fileSize || "1.8 MB",
      status: "Under Review",
      uploadedDate: new Date().toISOString().split("T")[0],
      ownerId: effectiveOwnerId,
    };
    setShippingDocuments((prev) => [newDoc, ...prev]);
    showToast(
      "success",
      "Document Uploaded",
      `${doc.name} submitted for port authority clearance.`,
    );
    return newDoc;
  };

  const deleteDocument = async (docId: string): Promise<void> => {
    const docToDelete = shippingDocuments.find((d) => d.id === docId);
    setShippingDocuments((prev) => prev.filter((d) => d.id !== docId));
    try {
      await DocumentService.deleteDocument(docId, docToDelete?.fileUrl);
      showToast(
        "info",
        "Document Removed",
        "Document removed from vessel repository.",
      );
    } catch (e) {
      console.warn("[OperationsContext] deleteDocument sync warning", e);
    }
  };

  const sendCopilotMessage = async (query: string) => {
    const userMsg: CopilotMessage = {
      id: "msg-" + Date.now(),
      sender: "user",
      text: query,
      timestamp:
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }) + " UTC",
    };

    setCopilotMessages((prev) => [...prev, userMsg]);
    setIsCopilotLoading(true);

    try {
      const oceanStar = vessels.find((v) => v.id === "VES-01");
      const b04 = berths.find((b) => b.id === "B04");
      const c03 = cranes.find((c) => c.id === "C03");
      const activeAlerts = alerts.filter((a) => !a.isResolved);

      const response = await geminiCopilotService.processUserQuery(query, {
        vessels,
        berths,
        cranes,
        yardBlocks,
        forecast: forecast || undefined,
        optimization: optimization || undefined,
        simulation: simulation || undefined,
        routes,
        shiftPlans,
        alerts,
        berthRequests,
        isOptimizationApplied,
        isRecoveryPlanApplied,
        conversationHistory: copilotMessages.map((m) => ({
          sender: m.sender,
          text: m.text,
        })),
        oceanStarBerth:
          oceanStar?.assignedBerth || (isOptimizationApplied ? "B02" : "B04"),
        b04Utilization:
          b04?.predictedUtilization || (isOptimizationApplied ? 78 : 94),
        c03Status:
          c03?.status ||
          (isRecoveryPlanApplied ? "MAINTENANCE (C05 Replaced)" : "FAILED"),
        activeAlertsCount: activeAlerts.length,
      });

      setCopilotMessages((prev) => [...prev, response]);
    } catch (error) {
      if (import.meta.env.DEV)
        console.error("Error executing Gemini Copilot query:", error);
      const errResponse: CopilotMessage = {
        id: "msg-err-" + Date.now(),
        sender: "gemini",
        text: "An error occurred while connecting to Gemini Copilot. Operational telemetry remains active.",
        timestamp:
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }) + " UTC",
      };
      setCopilotMessages((prev) => [...prev, errResponse]);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  const resetToDefault = () => {
    if (isDemoUser) {
      setVessels(initialVessels);
      setBerths(initialBerths);
      setCranes(initialCranes);
      setYardBlocks(initialYardBlocks);
      setForecast(initialForecastData);
      setOptimization(initialOptimizationResult);
      setSimulation(initialSimulationResult);
      setShiftPlans(initialShiftPlans);
      setAlerts(initialAlerts);
      setBerthRequests(initialBerthRequests);
      setShippingDocuments(initialShippingDocuments);
      setIsOptimizationApplied(false);
      setIsRecoveryPlanApplied(false);
      showToast(
        "info",
        "State Reset",
        "Port operations reset to baseline demo state.",
      );
    } else {
      setForecast(null);
      setOptimization(null);
      setSimulation(null);
      setIsOptimizationApplied(false);
      setIsRecoveryPlanApplied(false);
      showToast(
        "info",
        "Data Refreshed",
        "Port operations baseline restored.",
      );
    }
  };

  const importCsvData = (importedVessels: Vessel[], customBerths?: Berth[]) => {
    setVessels(importedVessels);
    if (customBerths && customBerths.length > 0) {
      setBerths(customBerths);
    }
    showToast(
      "success",
      "Operational Data Ingested",
      `Successfully loaded ${importedVessels.length} vessel records into active telemetry.`
    );
  };

  const redistributeYardBlock = (sourceId: string, targetId: string, amountTeu: number) => {
    setYardBlocks((prev) =>
      prev.map((block) => {
        if (block.id === sourceId) {
          const newOccupied = Math.max(0, block.occupiedTeu - amountTeu);
          const newUtil = Math.round((newOccupied / block.totalTeu) * 100);
          return {
            ...block,
            occupiedTeu: newOccupied,
            utilizationPercent: newUtil,
            congestionRisk:
              newUtil >= 85 ? "High" : newUtil >= 70 ? "Moderate" : "Normal",
            suggestedRedistribution: undefined,
          };
        }
        if (block.id === targetId) {
          const newOccupied = Math.min(
            block.totalTeu,
            block.occupiedTeu + amountTeu
          );
          const newUtil = Math.round((newOccupied / block.totalTeu) * 100);
          return {
            ...block,
            occupiedTeu: newOccupied,
            utilizationPercent: newUtil,
            congestionRisk:
              newUtil >= 85 ? "High" : newUtil >= 70 ? "Moderate" : "Normal",
          };
        }
        return block;
      })
    );
    showToast(
      "success",
      "Yard Transfer Dispatched",
      `Transferred ${amountTeu.toLocaleString()} TEU from ${sourceId} to ${targetId}. Density balanced.`
    );
  };

  const contextValue = useMemo(
    () => ({
      vessels,
      berths,
      cranes,
      yardBlocks,
      forecast,
      optimization,
      simulation,
      routes,
      setRoutes,
      shiftPlans,
      alerts,
      berthRequests,
      shippingDocuments,
      isOptimizationApplied,
      isRecoveryPlanApplied,
      isSimulating,
      isCopilotOpen,
      setIsCopilotOpen,
      copilotMessages,
      isCopilotLoading,
      toast,
      clearToast,
      showToast,
      applyOptimization,
      runSimulation,
      applyRecoveryPlan,
      reassignVesselBerth,
      resolveAlert,
      sendCopilotMessage,
      resetToDefault,
      importCsvData,
      redistributeYardBlock,
      addVessel,
      updateVessel,
      deleteVessel,
      updateVesselEta,
      submitBerthRequest,
      updateBerthRequestStatus,
      updateCargoInfo,
      uploadDocument,
      deleteDocument,
      readNotificationIds,
      isNotificationRead,
      toggleNotificationRead,
      markAllNotificationsRead,
      unreadAgentAlertsCount,
      selectedBerthId,
      setSelectedBerthId,
      selectedVesselId,
      setSelectedVesselId,
      searchQuery,
      setSearchQuery,
    }),
    [
      vessels,
      berths,
      cranes,
      yardBlocks,
      forecast,
      optimization,
      simulation,
      routes,
      shiftPlans,
      alerts,
      berthRequests,
      shippingDocuments,
      readNotificationIds,
      unreadAgentAlertsCount,
      isOptimizationApplied,
      isRecoveryPlanApplied,
      isSimulating,
      isCopilotOpen,
      copilotMessages,
      isCopilotLoading,
      toast,
      selectedBerthId,
      selectedVesselId,
      searchQuery,
    ],
  );

  return (
    <OperationsContext.Provider value={contextValue}>
      {children}
    </OperationsContext.Provider>
  );
};

export const useOperations = () => {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error("useOperations must be used within an OperationsProvider");
  }
  return context;
};
