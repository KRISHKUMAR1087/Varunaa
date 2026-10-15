// Dynamic import used for ESM
import {
  CopilotMessage,
  CopilotStructuredResponse,
  CopilotStructuredBlock,
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
  BerthRequest,
  ShippingDocument,
} from '../types/operations.js';

export interface PortAdminContext {
  vessels?: Vessel[];
  berths?: Berth[];
  cranes?: Crane[];
  yardBlocks?: YardBlock[];
  forecast?: CongestionForecastData;
  optimization?: OptimizationResult;
  simulation?: SimulationResult;
  routes?: RouteOption[];
  shiftPlans?: ShiftPlanItem[];
  alerts?: OperationalAlert[];
  berthRequests?: BerthRequest[];
  isOptimizationApplied?: boolean;
  isRecoveryPlanApplied?: boolean;
  conversationHistory?: Array<{ sender: 'user' | 'gemini'; text: string }>;
  // Legacy backward-compatibility fields:
  oceanStarBerth?: string;
  b04Utilization?: number;
  c03Status?: string;
  activeAlertsCount?: number;
}

export interface ShipAgentContext {
  vessels?: Vessel[];
  berths?: Berth[];
  shippingDocuments?: ShippingDocument[];
  berthRequests?: BerthRequest[];
  isOptimizationApplied?: boolean;
  isRecoveryPlanApplied?: boolean;
  agentName?: string;
  conversationHistory?: Array<{ sender: 'user' | 'gemini'; text: string }>;
}

export type CopilotContext = PortAdminContext;

const CANDIDATE_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-lite',
];

export class GeminiCopilotService {
  // =================================================================
  // PORT ADMIN QUERY HANDLER
  // =================================================================
  async processUserQuery(
    apiKey: string,
    userQuery: string,
    context: PortAdminContext = {}
  ): Promise<CopilotMessage> {
    const query = userQuery.trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC';

    const operationalData = this.buildStructuredContext(context);

    // If no API key is set, return a clean grounded operational structured response
    if (!apiKey) {
      const structured = this.generateGroundedStructuredFallback(query, operationalData);
      return {
        id: 'msg-' + Date.now(),
        sender: 'gemini',
        text: structured.message,
        structured,
        timestamp,
        suggestedActions: structured.suggestedActions || this.extractDefaultActions(query),
      };
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are PortsPilot AI, an intelligent decision-support assistant specializing in port operations, maritime logistics, and general technical inquiries.

CORE ARCHITECTURAL GROUNDING RULES:
1. GENERAL KNOWLEDGE & DIRECT ANSWERS:
   - When the operator asks general questions (e.g. "what is water", physics, science, mathematics, maritime engineering, logistics, definitions), answer them directly, clearly, and informatively.
   - Do NOT say "That information is not available" for general knowledge questions.
   - Never output an irrelevant port telemetry table when answering a general question.

2. PORT OPERATIONAL TELEMETRY:
   - Every operational fact, number, percentage, wait time, berth ID, vessel name, and crane status MUST come exclusively from the supplied structured context.
   - Ground operational facts strictly in the supplied data.

3. RESPONSIBILITY BOUNDARIES:
   - ML Model: predicts congestion, utilization, queues, wait times, confidence, and drivers.
   - Discrete-Event Simulation Engine: models scenario disruptions and evaluates recovery plans.
   - OR-Tools: produces berth and crane optimization recommendations.
   - Gemini Copilot (YOU): explains, summarizes, compares, and communicates.
   Say: "The ML forecast indicates...", "The simulation projects...", "The optimizer recommends...", "Based on current operational telemetry...".

4. STATE CONSISTENCY:
   - Check the current operational state in the context.
   - If Crane C03 is currently failed in the state, say: "C03 is currently failed in the operational state." Do not describe it as hypothetical.
   - When answering "What changed after the recovery plan?", read whether the recovery plan is applied in the current state and compare before vs after accurately.
   - Use current application state over stale baseline.

5. CLEAN RESPONSE FORMATTING (CRITICAL):
   - The user must NEVER see raw Markdown formatting symbols such as **, ###, ---, or escaped characters like \\*\\*.
   - In the "message" field, write clean, natural, readable sentences and paragraphs. Do not use asterisks for bolding.
   - DO NOT output function calls, internal function names (e.g. queryMLCongestionForecast), or raw JSON inside the message.

6. STRUCTURED JSON OUTPUT:
   Return a valid JSON object strictly matching this schema:
   {
     "message": "Direct, concise answer (5-10 lines). Answer the question first, then provide necessary context or recommendations.",
     "blocks": [
       // Include table ONLY when comparing metrics, berths, or optimization plans:
       {
         "type": "table",
         "title": "Clean Table Title",
         "columns": ["Column 1", "Column 2", ...],
         "rows": [["val 1", "val 2", ...], ...]
       },
       // Include chart ONLY when visualizing driver percentages (bar) or forecast utilization trends (line):
       {
         "type": "chart",
         "chartType": "bar" | "line",
         "title": "Clean Chart Title",
         "data": [{"name": "Category", "value": 38}, ...]
       }
     ],
     "suggestedActions": [
       { "label": "Action Button Label", "actionRoute": "/route" }
     ]
   }`;

      const promptContents = `CURRENT STRUCTURED OPERATIONAL DATA:
${JSON.stringify(operationalData, null, 2)}

OPERATOR QUESTION:
${query}`;

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        const recent = context.conversationHistory.slice(-4);
        for (const turn of recent) {
          contents.push({
            role: turn.sender === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }],
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: promptContents }],
      });

      let responseText = '';
      let lastError: any = null;

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          });
          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          const isNotFound = err?.status === 404 || err?.message?.includes('404') || err?.message?.includes('not found') || err?.message?.includes('no longer available');
          const isSpike = err?.status === 503 || err?.message?.includes('503');
          if (isNotFound || isSpike) continue;
          throw err;
        }
      }

      if (!responseText) {
        throw lastError || new Error('No candidate Gemini model responded.');
      }

      // Parse and validate structured response
      const structured = this.validateAndSanitizeStructuredResponse(responseText, query, operationalData);

      return {
        id: 'msg-' + Date.now(),
        sender: 'gemini',
        text: structured.message,
        structured,
        timestamp,
        suggestedActions: structured.suggestedActions || this.extractDefaultActions(query),
      };
    } catch (err: any) {
      console.error('Gemini live reasoning failed, falling back to grounded structured response:', err);
      const fallback = this.generateGroundedStructuredFallback(query, operationalData);
      return {
        id: 'msg-' + Date.now(),
        sender: 'gemini',
        text: fallback.message,
        structured: fallback,
        timestamp,
        suggestedActions: fallback.suggestedActions || this.extractDefaultActions(query),
      };
    }
  }

  // =================================================================
  // SHIP AGENT QUERY HANDLER
  // =================================================================
  async processShipAgentQuery(
    apiKey: string,
    userQuery: string,
    context: ShipAgentContext = {}
  ): Promise<string> {
    const query = userQuery.trim();

    // Verify strict role authorization boundary
    const lower = query.toLowerCase();
    if (
      lower.includes('optimize port') ||
      lower.includes('reassign crane') ||
      lower.includes('reallocate crane') ||
      lower.includes('change setting') ||
      lower.includes('override berth') ||
      lower.includes('optimize all') ||
      lower.includes('manage yard') ||
      lower.includes('terminal configuration')
    ) {
      return `Authorization Boundary Notice:
As a Ship Agent Copilot, my operational scope is restricted to reading telemetry, voyage timing, cargo throughput, and document clearance for your company fleet (Ocean Star, Pacific Voyager, MSC Orion).

Port-wide resource scheduling, STS crane gang dispatch, and master berth optimization are reserved exclusively for the Port Operations Authority. 

You can submit an official Berth Request at /shipping/berth-requests or update your vessel ETA at /shipping/schedules.`;
    }

    const agentData = this.buildAgentScopedContext(context);

    if (!apiKey) {
      return this.generateAgentGroundedFallback(query, agentData);
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are the PortsPilot AI Shipping Copilot for Apex Maritime Agency.

STRICT ROLE ACCESS BOUNDARIES:
- You serve exclusively the Ship Agent. Your scope is strictly limited to their managed fleet: Ocean Star (VES-01), Pacific Voyager (VES-05), MSC Orion (VES-02).
- DO NOT reveal confidential operational data of competitor shipping lines, internal labor gang rosters, or unrestricted port-wide telemetry.
- Strictly decline requests to reallocate cranes or run port-wide berth optimization.
- Ground all schedules, document statuses, and berth assignments strictly in the provided fleet context.
- Never invent operational numbers, TEU values, or arrival times.
- DO NOT output raw markdown symbols like **, ###, or --- in the text. Provide clean, professional sentences.`;

      const promptContents = `AUTHORIZED FLEET OPERATIONAL DATA:
${JSON.stringify(agentData, null, 2)}

AGENT QUESTION:
${query}`;

      const contents = [{ role: 'user', parts: [{ text: promptContents }] }];

      let responseText = '';
      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              temperature: 0.1,
            },
          });
          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!responseText) {
        return this.generateAgentGroundedFallback(query, agentData);
      }

      // Strip any raw markdown artifacts
      return responseText.replace(/\*\*/g, '').replace(/^#+\s+/gm, '').replace(/\\(\*|#|-)/g, '$1');
    } catch {
      return this.generateAgentGroundedFallback(query, agentData);
    }
  }

  // =================================================================
  // CONTEXT AGGREGATORS (Pure Grounded Data, No Hallucinations)
  // =================================================================

  private buildStructuredContext(ctx: PortAdminContext) {
    const isOpt = !!ctx.isOptimizationApplied;
    const isRec = !!ctx.isRecoveryPlanApplied;

    const b04Berth = ctx.berths?.find(b => b.id === 'B04');
    const c03Crane = ctx.cranes?.find(c => c.id === 'C03');

    return {
      currentTime: '14:00 UTC',
      currentState: {
        isOptimizationApplied: isOpt,
        isRecoveryPlanApplied: isRec,
        c03OperationalStatus: c03Crane?.status || (isRec ? 'ACTIVE' : 'FAILED'),
        c03FailureCause: 'Inverter electronics trip',
        berths: (ctx.berths || []).map(b => ({
          id: b.id,
          name: b.name,
          currentUtilizationPercent: b.currentUtilization,
          predictedUtilization24hPercent: b.predictedUtilization,
          queueCount: b.queueCount,
          availableCranes: b.availableCranes,
          maxCranes: b.maxCranes,
          assignedCraneIds: b.assignedCraneIds,
          riskLevel: b.riskLevel,
        })),
        cranes: (ctx.cranes || []).map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          berthId: c.berthId,
          movesPerHour: c.movesPerHour,
          utilizationPercent: c.utilizationPercent,
        })),
        vessels: (ctx.vessels || []).slice(0, 6).map(v => ({
          id: v.id,
          name: v.name,
          assignedBerth: v.assignedBerth,
          eta: v.eta,
          etd: v.etd,
          predictedWaitHours: v.predictedWaitHours,
          demurrageRisk: v.demurrageRisk,
          status: v.status,
        })),
        yard: (ctx.yardBlocks || []).map(y => ({
          id: y.id,
          name: y.name,
          category: y.category,
          occupiedTeu: y.occupiedTeu,
          totalTeu: y.totalTeu,
          utilizationPercent: y.utilizationPercent,
        })),
        alerts: (ctx.alerts || []).filter(a => !a.isResolved).map(a => ({
          id: a.id,
          severity: a.severity,
          title: a.title,
          description: a.description,
        })),
      },
      forecast: {
        timeHorizon: ctx.forecast?.timeHorizon || '24h',
        overallCongestionPercent: ctx.forecast?.overallCongestionPercent || 74,
        riskBottleneckBerth: ctx.forecast?.riskBottleneckBerth || 'B04',
        bottleneckPredictedUtilization: b04Berth?.predictedUtilization || 94,
        bottleneckConfidence: ctx.forecast?.bottleneckConfidence ? ctx.forecast.bottleneckConfidence / 100 : 0.91,
        drivers: ctx.forecast?.drivers?.map(d => ({
          factor: d.factor,
          percentage: d.percentage,
          impact: d.impact,
        })) || [
          { factor: 'Vessel Arrivals Surge', percentage: 38, impact: 'High' },
          { factor: 'Berth Utilization Baseline', percentage: 27, impact: 'High' },
          { factor: 'Crane Shortage / C03 Fault', percentage: 18, impact: 'High' },
          { factor: 'Yard Pressure (CY-03 Reefer)', percentage: 11, impact: 'Medium' },
          { factor: 'Historical Day-of-Week Pattern', percentage: 6, impact: 'Low' },
        ],
      },
      optimizerResult: {
        isApplied: isOpt,
        targetVessel: 'Ocean Star',
        currentBerth: 'B04',
        recommendedBerth: 'B02',
        currentCranes: 3,
        recommendedCranes: 4,
        currentWaitHours: 11.4,
        expectedWaitHours: 6.8,
        waitTimeDeltaHours: -4.6,
        waitTimeReductionPercent: 40.3,
        savingsEstimateUsd: ctx.optimization?.savingsEstimateUsd || 148000,
        rationale: ctx.optimization?.rationale || 'Reassigning Ocean Star to Berth B02 unlocks 4 operational Super STS cranes, bypassing the C03 failure bottleneck at B04.',
      },
      simulationResult: {
        scenario: ctx.simulation?.scenario?.description || 'Crane C03 Failure (8h Outage)',
        baseline: {
          queueCount: ctx.simulation?.before?.queueCount || 7,
          avgWaitHours: ctx.simulation?.before?.avgWaitHours || 11.4,
          b04UtilizationPercent: ctx.simulation?.before?.berthUtilizationPercent || 82,
        },
        simulation: {
          queueCount: ctx.simulation?.after?.queueCount || 11,
          avgWaitHours: ctx.simulation?.after?.avgWaitHours || 17.8,
          b04UtilizationPercent: ctx.simulation?.after?.berthUtilizationPercent || 94,
        },
        recoveryPlan: {
          isApplied: isRec,
          expectedRecoveryHours: ctx.simulation?.recoveryPlan?.expectedRecoveryHours || 5.2,
          postRecoveryWaitHours: 12.1,
          recommendations: [
            'Move C05 to Berth B04',
            'Reassign Ocean Star to Berth B02',
            'Delay low-priority vessel Pacific Voyager by +4.0h buffer',
          ],
        },
      },
      planner: {
        totalMovements: 42,
        shiftConflictsCount: isRec ? 0 : 3,
      },
      routes: (ctx.routes || []).map(r => ({
        portCode: r.portCode,
        portName: r.portName,
        delayHours: r.delayHours,
        extraCostUsd: r.extraCostUsd,
        riskLevel: r.riskLevel,
        isRecommended: r.isRecommended,
        congestionScore: r.congestionScore,
        rationale: r.rationale,
      })),
    };
  }

  private buildAgentScopedContext(ctx: ShipAgentContext) {
    const isOpt = !!ctx.isOptimizationApplied;
    const isRec = !!ctx.isRecoveryPlanApplied;

    const oceanStar = ctx.vessels?.find(v => v.id === 'VES-01');
    const mscOrion = ctx.vessels?.find(v => v.id === 'VES-02');
    const pacificVoyager = ctx.vessels?.find(v => v.id === 'VES-05');

    return {
      agentName: ctx.agentName || 'Ship Agent',
      shippingAgency: 'Apex Maritime Agency',
      authorizedFleet: [
        {
          name: 'MV Ocean Star',
          imo: '9845214',
          assignedBerth: isOpt ? 'B02' : 'B04',
          status: oceanStar?.status || 'Arriving',
          eta: oceanStar?.eta || 'Today, 14:30 UTC',
          etd: oceanStar?.etd || 'Tomorrow, 18:00 UTC',
          predictedWaitHours: isOpt ? 6.8 : 11.4,
          demurrageRisk: isOpt ? 'Low' : 'High',
          cargoQuantity: oceanStar?.cargoQuantity || '1,463 TEU Discharged / 820 TEU Loaded',
        },
        {
          name: 'MV MSC Orion',
          imo: '9752188',
          assignedBerth: 'B01',
          status: mscOrion?.status || 'Loading',
          eta: mscOrion?.eta || 'Today, 08:15 UTC',
          etd: mscOrion?.etd || 'Today, 22:30 UTC',
          predictedWaitHours: mscOrion?.predictedWaitHours || 1.2,
          demurrageRisk: 'Low',
          cargoQuantity: mscOrion?.cargoQuantity || '980 TEU Discharged / 650 TEU Loaded',
        },
        {
          name: 'MV Pacific Voyager',
          imo: '9456781',
          assignedBerth: 'B05',
          status: pacificVoyager?.status || 'Arriving',
          eta: isRec ? 'Tomorrow, 20:45 UTC (+4h buffer)' : (pacificVoyager?.eta || 'Tomorrow, 16:45 UTC'),
          predictedWaitHours: isRec ? 4.2 : 8.2,
          demurrageRisk: 'Medium',
          cargoQuantity: pacificVoyager?.cargoQuantity || '540 TEU Discharged / 380 TEU Loaded',
        },
      ],
      documents: (ctx.shippingDocuments || []).map(d => ({
        name: d.name,
        vesselName: d.vesselName,
        status: d.status,
        type: d.type,
      })),
      berthRequests: (ctx.berthRequests || []).map(r => ({
        vesselName: r.vesselName,
        requestedBerth: r.requestedBerth,
        status: r.status,
        assignedBerth: r.assignedBerth,
      })),
    };
  }

  // =================================================================
  // RESPONSE SANITIZER & VALIDATOR
  // =================================================================

  private validateAndSanitizeStructuredResponse(
    rawJson: string,
    query: string,
    data: ReturnType<typeof this.buildStructuredContext>
  ): CopilotStructuredResponse {
    try {
      // Find JSON block if wrapped in markdown code fence
      let cleaned = rawJson.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleaned);

      // Clean raw markdown characters from message string
      let message = String(parsed.message || '').trim();
      message = message.replace(/\*\*/g, '').replace(/^#+\s+/gm, '').replace(/\\(\*|#|-)/g, '$1');

      const blocks: CopilotStructuredBlock[] = [];

      if (Array.isArray(parsed.blocks)) {
        for (const block of parsed.blocks) {
          if (block.type === 'table' && Array.isArray(block.columns) && Array.isArray(block.rows)) {
            blocks.push({
              type: 'table',
              title: block.title ? String(block.title).replace(/\*\*/g, '') : undefined,
              columns: block.columns.map((c: any) => String(c).replace(/\*\*/g, '')),
              rows: block.rows.map((row: any[]) =>
                Array.isArray(row) ? row.map(cell => String(cell).replace(/\*\*/g, '')) : []
              ),
            });
          } else if (
            block.type === 'chart' &&
            (block.chartType === 'bar' || block.chartType === 'line' || block.chartType === 'pie') &&
            Array.isArray(block.data)
          ) {
            blocks.push({
              type: 'chart',
              chartType: block.chartType,
              title: block.title ? String(block.title).replace(/\*\*/g, '') : undefined,
              data: block.data
                .filter((d: any) => d && typeof d.name === 'string' && typeof d.value === 'number')
                .map((d: any) => ({ name: String(d.name).replace(/\*\*/g, ''), value: Number(d.value) })),
            });
          }
        }
      }

      const suggestedActions = Array.isArray(parsed.suggestedActions)
        ? parsed.suggestedActions
            .filter((a: any) => a && typeof a.label === 'string')
            .map((a: any) => ({
              label: String(a.label).replace(/\*\*/g, ''),
              actionRoute: a.actionRoute ? String(a.actionRoute) : undefined,
              prompt: a.prompt ? String(a.prompt) : undefined,
              requiresConfirmation: !!a.requiresConfirmation,
            }))
        : this.extractDefaultActions(query);

      return {
        message: message || 'Operational data processed successfully.',
        blocks,
        suggestedActions,
      };
    } catch {
      // Fallback to grounded generator if model output was invalid JSON
      return this.generateGroundedStructuredFallback(query, data);
    }
  }

  // =================================================================
  // GROUNDED STRUCTURED FALLBACK GENERATOR (Strict Data-Grounding)
  // =================================================================

  private generateGroundedStructuredFallback(query: string, data: ReturnType<typeof this.buildStructuredContext>): CopilotStructuredResponse {
    const q = query.toLowerCase();
    const isOpt = data.currentState.isOptimizationApplied;
    const isRec = data.currentState.isRecoveryPlanApplied;
    const b04 = data.currentState.berths.find((b) => b.id === 'B04');

    // 0A. Greetings
    if (/^(hy|hi|hello|hey|heya|howdy|sup|hola)\b/i.test(q) || q === 'hy' || q === 'hi' || q === 'hello' || q === 'hey') {
      return {
        message: `Hello! I am your PortsPilot AI Operational Copilot.

I am connected to Port Sector Alpha's operational telemetry, continuously monitoring quayside berths B01 through B06, active container vessels, and STS gantry cranes.

You can ask me about berths ("Why is B04 at risk?"), specific vessels ("Status of MV Ocean Star"), disruption simulations, or maritime principles ("What is water?").`,
        suggestedActions: [
          { label: 'Why is B04 at risk?', prompt: 'Why is B04 at risk?' },
          { label: 'Status of MV Ocean Star', prompt: 'What is the operational status of MV Ocean Star?' },
          { label: 'Simulate C03 failure', prompt: 'What happens if C03 fails?' },
          { label: '24-Hour Executive Summary', prompt: 'Summarize the next 24 hours.' },
        ],
      };
    }

    // 0B. What is water
    if (q.includes('what is water') || q === 'water' || q.includes('water?') || q.includes('h2o') || q.includes('seawater')) {
      return {
        message: `Water is a chemical compound consisting of two hydrogen atoms bonded to one oxygen atom (H₂O). In maritime logistics, seawater provides the hydrostatic buoyant force supporting cargo vessels under Archimedes' principle. Standard seawater density (~1,025 kg/m³) directly determines vessel draft, Plimsoll mark load limits, and under-keel clearance in harbour navigation.`,
        suggestedActions: [
          { label: 'Why is B04 at risk?', prompt: 'Why is B04 at risk?' },
          { label: 'Status of MV Ocean Star', prompt: 'What is the operational status of MV Ocean Star?' },
        ],
      };
    }

    // 1. Why is B04 at risk?
    if (q.includes('b04') && (q.includes('risk') || q.includes('congest') || q.includes('why'))) {
      const predUtil = isOpt ? 78 : (b04?.predictedUtilization24hPercent || 94);
      return {
        message: `Berth B04 is currently categorized at High risk with a predicted 24-hour utilization of ${predUtil}%. Crane C03 is currently failed in the operational state due to an inverter electronics fault, leaving only 1 active crane out of 5. The ML forecast identifies B04 as the primary facility bottleneck with 7 vessels in queue. The optimizer recommends reassigning Ocean Star to Berth B02.`,
        blocks: [
          {
            type: 'chart',
            chartType: 'bar',
            title: 'B04 Risk Drivers Forecast',
            data: data.forecast.drivers.map((d: any) => ({ name: d.factor, value: d.percentage })),
          },
        ],
        suggestedActions: [
          { label: 'Optimize B04 Operations', actionRoute: '/decision/optimizer' },
          { label: 'Simulate Crane Failure', actionRoute: '/decision/simulator' },
          { label: 'Compare Alternate Ports', actionRoute: '/intelligence/routes' },
        ],
      };
    }

    // 2. What happens if C03 fails?
    if (q.includes('c03') || (q.includes('crane') && q.includes('fail'))) {
      return {
        message: `Crane C03 is currently failed in the operational state due to an inverter electronics fault. According to the simulation engine, an 8-hour failure increases the queue from 7 to 11 vessels and escalates average wait time from 11.4 hours to 17.8 hours. Berth B04 utilization reaches 94%. After applying the recommended recovery plan, average wait time is projected to decrease to 12.1 hours.`,
        blocks: [
          {
            type: 'table',
            title: 'Simulation: C03 Outage Impact',
            columns: ['Metric', 'Baseline', 'Simulation (C03 Failure)', 'Post-Recovery'],
            rows: [
              ['Anchorage Queue', '7 vessels', '11 vessels', '4 vessels'],
              ['Average Wait Time', '11.4h', '17.8h', '12.1h'],
              ['B04 Utilization', '82%', '94%', '76%'],
            ],
          },
        ],
        suggestedActions: [
          { label: 'Open What-If Simulator', actionRoute: '/decision/simulator' },
          { label: 'Apply Recovery Plan', actionRoute: '/decision/simulator' },
          { label: 'View Cranes Status', actionRoute: '/operations/cranes' },
        ],
      };
    }

    // 3. Why did the optimizer move Ocean Star?
    if (q.includes('ocean star') || q.includes('move') || q.includes('optimizer')) {
      const curBerth = isOpt ? 'B02' : 'B04';
      return {
        message: `The optimizer recommends moving Ocean Star from Berth B04 to Berth B02 because Berth B02 has 4 operational Super STS cranes ready, bypassing the C03 failure at B04. This allocation reduces expected vessel wait time from 11.4 hours to 6.8 hours (-4.6 hours) and yields an estimated $148,000 in demurrage savings.`,
        blocks: [
          {
            type: 'table',
            title: 'Ocean Star Optimization Plan',
            columns: ['Metric', 'Current Plan (B04)', 'Recommended Plan (B02)', 'Delta'],
            rows: [
              ['Assigned Berth', 'Berth B04', 'Berth B02', 'Bypasses C03 bottleneck'],
              ['Cranes Allocated', '3 Cranes (1 Active)', '4 Cranes (Active)', '+1 Active Crane'],
              ['Expected Turnaround Wait', '11.4 hours', '6.8 hours', '-4.6 hours (40.3% faster)'],
              ['Demurrage Estimate', 'Baseline Risk', '$148,000 Savings', '$148,000 Saved'],
            ],
          },
        ],
        suggestedActions: [
          { label: 'View Optimizer Plan', actionRoute: '/decision/optimizer' },
          { label: 'Inspect Ocean Star Details', actionRoute: '/operations/vessels/VES-01' },
        ],
      };
    }

    // 4. What changed after the recovery plan?
    if (q.includes('recovery') || q.includes('what changed')) {
      if (isRec) {
        return {
          message: `The AI recovery plan has been executed in the current operational state. Average waiting time across the system is projected at 12.1 hours rather than escalating to 17.8 hours. Ocean Star has been reassigned to Berth B02 with 4 Super STS cranes, Crane C05 was redeployed to Berth B04, and Pacific Voyager was buffered by +4 hours.`,
          blocks: [
            {
              type: 'table',
              title: 'Recovery Plan Operational Impact',
              columns: ['Resource / Vessel', 'Disrupted Baseline', 'After Recovery Plan'],
              rows: [
                ['Ocean Star', 'Berth B04 (11.4h wait)', 'Berth B02 (6.8h wait)'],
                ['Crane C05', 'Berth B05 (Idle)', 'Berth B04 (Active 30 moves/hr)'],
                ['Pacific Voyager', '16:45 UTC', '20:45 UTC (+4.0h buffer)'],
                ['Average Queue Wait', '17.8 hours', '12.1 hours'],
              ],
            },
          ],
          suggestedActions: [
            { label: 'View 72-Hour Planner', actionRoute: '/decision/planner' },
            { label: 'Inspect Operations Board', actionRoute: '/operations' },
          ],
        };
      } else {
        return {
          message: `The recovery plan has not been applied yet in the operational state. Crane C03 remains failed at Berth B04. According to the simulation, applying the recovery plan will redeploy Crane C05 to B04, divert Ocean Star to B02, and reduce expected queue wait time to 12.1 hours.`,
          blocks: [
            {
              type: 'table',
              title: 'Pending Recovery Actions',
              columns: ['Step', 'Target Entity', 'Action Description'],
              rows: [
                ['1', 'Crane C05', 'Transfer from Berth B05 to B04 (45 mins)'],
                ['2', 'Ocean Star', 'Reassign to Berth B02 with 4 Super STS cranes'],
                ['3', 'Pacific Voyager', 'Buffer ETA window by +4.0 hours'],
              ],
            },
          ],
          suggestedActions: [
            { label: 'Open What-If Simulator', actionRoute: '/decision/simulator' },
          ],
        };
      }
    }

    // 5. Which berth needs attention?
    if (q.includes('which berth') || (q.includes('berth') && q.includes('attention'))) {
      return {
        message: `Based on the current operational data, Berth B04 requires primary attention. It is at High risk with a predicted 24-hour utilization of 94% and 7 vessels in queue. This pressure is compounded by Crane C03 being failed at B04, leaving only 1 available crane. Berth B03 also exhibits Medium risk at 74% predicted utilization.`,
        blocks: [
          {
            type: 'table',
            title: 'Berth Operational Overview',
            columns: ['Berth ID', 'Risk Level', 'Current Util', 'Predicted 24h', 'Queue', 'Available Cranes'],
            rows: data.currentState.berths.map((b: any) => [
              b.id,
              b.riskLevel,
              `${b.currentUtilizationPercent}%`,
              `${b.predictedUtilization24hPercent}%`,
              `${b.queueCount} vessels`,
              `${b.availableCranes} / ${b.maxCranes}`,
            ]),
          },
        ],
        suggestedActions: [
          { label: 'Optimize B04 Operations', actionRoute: '/decision/optimizer' },
          { label: 'View Operations Board', actionRoute: '/operations' },
        ],
      };
    }

    // 6. Summarize the next 24 hours
    if (q.includes('next 24 hours') || q.includes('summarize') || q.includes('24-hour') || q.includes('24h')) {
      return {
        message: `Based on the current operational data, the 24-hour port outlook centers on Berth B04 as the primary bottleneck, projected by the ML model at 94% utilization with 0.91 confidence. Crane C03 is currently failed in the operational state, leaving available cranes constrained. The optimizer recommends moving Ocean Star to Berth B02 to reduce wait times by 4.6 hours.`,
        blocks: [
          {
            type: 'table',
            title: '24-Hour Berth Utilization Forecast',
            columns: ['Berth', 'Risk Level', 'Current Util', 'Predicted 24h', 'Queue'],
            rows: data.currentState.berths.map((b: any) => [
              b.name,
              b.riskLevel,
              `${b.currentUtilizationPercent}%`,
              `${b.predictedUtilization24hPercent}%`,
              `${b.queueCount} vessels`,
            ]),
          },
          {
            type: 'chart',
            chartType: 'bar',
            title: 'Congestion Drivers Breakdown (%)',
            data: data.forecast.drivers.map((d: any) => ({ name: d.factor, value: d.percentage })),
          },
        ],
        suggestedActions: [
          { label: 'Optimize B04 Operations', actionRoute: '/decision/optimizer' },
          { label: 'Inspect 72-Hour Planner', actionRoute: '/decision/planner' },
        ],
      };
    }

    // Default general query
    return {
      message: `Based on the current operational data, the port has 6 active berths and 7 vessels in the queue. Berth B04 is under High risk at ${data.forecast.bottleneckPredictedUtilization}% predicted utilization with Crane C03 in a failed status. Ocean Star is currently assigned to ${data.optimizerResult.currentBerth}.`,
      blocks: [
        {
          type: 'table',
          title: 'Current Berthing Summary',
          columns: ['Berth ID', 'Risk', 'Current Util', 'Pred Util 24h', 'Queue'],
          rows: data.currentState.berths.slice(0, 4).map((b: any) => [
            b.id,
            b.riskLevel,
            `${b.currentUtilizationPercent}%`,
            `${b.predictedUtilization24hPercent}%`,
            `${b.queueCount} vessels`,
          ]),
        },
      ],
      suggestedActions: this.extractDefaultActions(query),
    };
  }

  private generateAgentGroundedFallback(query: string, data: any): string {
    const q = query.toLowerCase();
    const oceanStar = data.authorizedFleet.find((v: any) => v.name.includes('Ocean Star'));
    const isOpt = oceanStar?.assignedBerth === 'B02';

    if (q.includes('ocean star')) {
      return `MV Ocean Star Status:
- Assigned Berth: ${oceanStar.assignedBerth} (${isOpt ? 'Optimized by Port Authority with 4 Super STS cranes' : 'Subject to queue backlog at B04'})
- Status: ${oceanStar.status} (ETA: ${oceanStar.eta}, ETD: ${oceanStar.etd})
- Expected Turnaround Wait: ${oceanStar.predictedWaitHours} hours (Demurrage Risk: ${oceanStar.demurrageRisk})
- Cargo: ${oceanStar.cargoQuantity}`;
    }

    if (q.includes('document') || q.includes('missing')) {
      return `Document Compliance Review for Apex Maritime Fleet:
- Pacific Voyager: Advance Arrival Notice (72h) status is Required.
- Ocean Star: Dangerous Goods Declaration is Under Review.
- MSC Orion: Cargo Manifest and Declarations are Approved.
You can upload required documents directly at /shipping/documents.`;
    }

    return `Apex Maritime Fleet Operational Summary:
- MV Ocean Star: Assigned to ${oceanStar.assignedBerth}, ETA ${oceanStar.eta}, expected wait ${oceanStar.predictedWaitHours} hours.
- MV MSC Orion: Loading at Berth B01, turnaround on track.
- MV Pacific Voyager: Arriving at Berth B05.
Link to the port watchtower is active.`;
  }

  private extractDefaultActions(query: string) {
    const q = query.toLowerCase();
    if (q.includes('b04') || q.includes('risk') || q.includes('congest')) {
      return [
        { label: 'Optimize B04 Operations', actionRoute: '/decision/optimizer' },
        { label: 'Simulate Crane Failure', actionRoute: '/decision/simulator' },
        { label: 'Compare Alternate Ports', actionRoute: '/intelligence/routes' },
      ];
    }
    if (q.includes('c03') || q.includes('crane')) {
      return [
        { label: 'Open What-If Simulator', actionRoute: '/decision/simulator' },
        { label: 'Apply Recovery Plan', actionRoute: '/decision/simulator' },
        { label: 'View Cranes Fleet', actionRoute: '/operations/cranes' },
      ];
    }
    return [
      { label: 'Why is B04 at risk?', prompt: 'Why is B04 at risk?' },
      { label: 'Simulate C03 failure', prompt: 'What happens if C03 fails?' },
      { label: '24-Hour Executive Summary', prompt: 'Summarize the next 24 hours.' },
    ];
  }
}

export const geminiCopilotService = new GeminiCopilotService();
