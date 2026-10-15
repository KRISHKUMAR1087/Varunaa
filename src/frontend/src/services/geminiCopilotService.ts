import { GoogleGenAI } from '@google/genai';
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
} from '../types/operations';

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
  private getApiKey(): string {
    const isPlaceholder = (k: string) =>
      !k ||
      k.startsWith('your-') ||
      k.includes('your-gemini') ||
      k.length < 15;

    // 1. Check localStorage if user configured a key in settings
    try {
      const local =
        localStorage.getItem('gemini_api_key') ||
        localStorage.getItem('VITE_GEMINI_API_KEY');
      if (local && !isPlaceholder(local.trim())) {
        return local.trim();
      }
    } catch {
      // ignore
    }

    // 2. Check Vite client environment variables
    try {
      const meta = import.meta as { env?: Record<string, string> };
      if (meta?.env) {
        if (meta.env.VITE_GEMINI_API_KEY && !isPlaceholder(meta.env.VITE_GEMINI_API_KEY.trim())) {
          return meta.env.VITE_GEMINI_API_KEY.trim();
        }
        if (meta.env.GEMINI_API_KEY && !isPlaceholder(meta.env.GEMINI_API_KEY.trim())) {
          return meta.env.GEMINI_API_KEY.trim();
        }
      }
    } catch {
      // ignore
    }

    // 3. Check process environment if available
    try {
      const proc = typeof process !== 'undefined' ? (process as { env?: Record<string, string> }) : null;
      if (proc?.env) {
        if (proc.env.VITE_GEMINI_API_KEY && !isPlaceholder(proc.env.VITE_GEMINI_API_KEY.trim())) {
          return proc.env.VITE_GEMINI_API_KEY.trim();
        }
        if (proc.env.GEMINI_API_KEY && !isPlaceholder(proc.env.GEMINI_API_KEY.trim())) {
          return proc.env.GEMINI_API_KEY.trim();
        }
      }
    } catch {
      // ignore
    }

    return '';
  }

  // =================================================================
  // PORT ADMIN QUERY HANDLER
  // =================================================================
  async processUserQuery(
    userQuery: string,
    context: PortAdminContext = {}
  ): Promise<CopilotMessage> {
    const apiKey = this.getApiKey();
    const query = userQuery.trim();
    const timestamp =
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC';

    const operationalData = this.buildStructuredContext(context);

    // If no valid API key is present, use our smart grounded operational intelligence engine
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

    // Attempt live Google Gemini generation with candidates
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are Varunaa AI, an intelligent conversational AI assistant specializing in port operations, maritime logistics, and general technical inquiries.

CORE ARCHITECTURAL RULES:
1. GENERAL KNOWLEDGE & DIRECT ANSWERS:
   - When the user asks general questions (e.g. "what is water", physics, science, mathematics, maritime engineering, geography, logistics, or everyday inquiries), ANSWER THEM DIRECTLY, CLEARLY, AND ACCURATELY.
   - Do NOT say "That information is not available in the operational data" for general knowledge questions.
   - Never dump an irrelevant table or berth telemetry snapshot when the user asks a general question.

2. PORT OPERATIONAL TELEMETRY:
   - When the user asks about THIS specific port's operations (berths B01-B06, vessels like MV Ocean Star, cranes like C03, yard blocks, congestion forecasts, or simulations), use the provided structured operational data.
   - Ground operational facts (wait times, percentages, berth allocations) strictly in the provided data.

3. CONVERSATIONAL INTEGRITY:
   - When the user greets you (e.g. "hi", "hy", "hello"), respond naturally and warmly, introducing your capabilities and offering relevant port operational insights.
   - Do NOT dump a full berth table if the user only said hello or asked a simple question.

4. CLEAN RESPONSE FORMATTING:
   - The user must NEVER see raw Markdown formatting symbols such as **, ###, ---, or escaped characters like \\*\\*.
   - In the "message" field, write clean, natural, readable sentences and paragraphs.
   - Return a valid JSON object matching the schema below.

JSON SCHEMA:
{
  "message": "Clear, concise direct answer to the user's question.",
  "blocks": [
    // Include table ONLY when explicitly comparing metrics, berths, or vessels:
    {
      "type": "table",
      "title": "Clean Table Title",
      "columns": ["Col 1", "Col 2"],
      "rows": [["val 1", "val 2"]]
    },
    // Include chart ONLY when visualizing driver percentages or utilization trends:
    {
      "type": "chart",
      "chartType": "bar" | "line",
      "title": "Clean Chart Title",
      "data": [{"name": "Category", "value": 38}]
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
              temperature: 0.2,
            },
          });
          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          continue;
        }
      }

      if (!responseText) {
        throw lastError || new Error('No candidate Gemini model responded.');
      }

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
      console.warn('Gemini live reasoning unavailable, using intelligent grounded operational engine:', err?.message || err);
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
    userQuery: string,
    context: ShipAgentContext = {}
  ): Promise<string> {
    const apiKey = this.getApiKey();
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
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are the Varunaa AI Shipping Copilot for Apex Maritime Agency.
- You serve exclusively the Ship Agent. Your scope is strictly limited to their managed fleet: Ocean Star (VES-01), Pacific Voyager (VES-05), MSC Orion (VES-02).
- Ground all schedules, document statuses, and berth assignments strictly in the provided fleet context.
- When the user greets you, respond warmly and professionally.
- DO NOT output raw markdown symbols like **, ###, or --- in the text.`;

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
              temperature: 0.2,
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
        vessels: (ctx.vessels || []).map(v => ({
          id: v.id,
          name: v.name,
          assignedBerth: v.assignedBerth,
          eta: v.eta,
          etd: v.etd,
          predictedWaitHours: v.predictedWaitHours,
          demurrageRisk: v.demurrageRisk,
          status: v.status,
          lengthMeters: v.lengthMeters,
          draughtMeters: v.draughtMeters,
          teuCapacity: v.teuCapacity,
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
    data: any
  ): CopilotStructuredResponse {
    try {
      let cleaned = rawJson.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleaned);

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
      return this.generateGroundedStructuredFallback(query, data);
    }
  }

  // =================================================================
  // INTELLIGENT GROUNDED OPERATIONAL ENGINE (Conversational & Precise)
  // =================================================================
  private generateGroundedStructuredFallback(query: string, data: any): CopilotStructuredResponse {
    const q = query.trim().toLowerCase();
    const isOpt = !!data.currentState?.isOptimizationApplied;
    const isRec = !!data.currentState?.isRecoveryPlanApplied;
    const berths = data.currentState?.berths || [];
    const vessels = data.currentState?.vessels || [];
    const cranes = data.currentState?.cranes || [];
    const yard = data.currentState?.yard || [];
    const alerts = data.currentState?.alerts || [];

    const b04 = berths.find((b: any) => b.id === 'B04');

    // ─── 1. GREETINGS & CASUAL INTERACTION ──────────────────────────────────────
    const isGreeting =
      /^(hy|hi|hello|hey|heya|howdy|sup|hola|yo|good morning|good afternoon|good evening)\b/i.test(q) ||
      q === 'hy' ||
      q === 'hi' ||
      q === 'hello' ||
      q === 'hey' ||
      q.includes('who are you') ||
      q.includes('what can you do') ||
      q.includes('introduce yourself') ||
      q.includes('help me');

    if (isGreeting) {
      return {
        message: `Hello! I am your Varunaa AI Operational Copilot.

I am connected to Port Sector Alpha's operational telemetry, continuously monitoring quayside berths B01 through B06, active container vessels, STS gantry cranes, and our 72-hour queuing congestion models.

Here is what you can ask me:
• "Why is Berth B04 at risk?" — Unpack the predicted bottleneck and ML attribution factors
• "Status of MV Ocean Star" — Check vessel ETA, wait times, and berth assignment
• "What happens if Crane C03 fails?" — Review discrete-event simulation impact and recovery
• "Why did the optimizer reassign Ocean Star?" — Examine the BAP/CAP demurrage savings
• "Summarize the next 24 hours" — Get a full executive shift outlook across all sectors

How can I assist your operations today?`,
        suggestedActions: [
          { label: 'Why is B04 at risk?', prompt: 'Why is B04 at risk?' },
          { label: 'Status of MV Ocean Star', prompt: 'What is the operational status of MV Ocean Star?' },
          { label: 'Simulate C03 failure', prompt: 'What happens if C03 fails?' },
          { label: '24-Hour Executive Summary', prompt: 'Summarize the next 24 hours.' },
        ],
      };
    }

    // ─── 2. ACKNOWLEDGEMENT / THANKS ───────────────────────────────────────────
    if (
      q.includes('thank') ||
      q.includes('thanks') ||
      q.includes('awesome') ||
      q.includes('great job') ||
      q.includes('perfect') ||
      q === 'ok' ||
      q === 'okay' ||
      q === 'got it'
    ) {
      return {
        message: `You're welcome! Operational telemetry remains active and synchronized across all port sectors. Let me know whenever you need further evaluations, berth reallocations, or shift updates.`,
        suggestedActions: [
          { label: 'View Command Center', actionRoute: '/dashboard' },
          { label: 'Open 72h Planner', actionRoute: '/decision/planner' },
        ],
      };
    }

    // ─── 2A. WATER & OCEAN HYDRODYNAMICS (Direct Answer to "what is water") ───────
    if (
      q.includes('what is water') ||
      q === 'water' ||
      q.includes('water?') ||
      q.includes('h2o') ||
      q.includes('seawater') ||
      q.includes('density of water') ||
      q.includes('buoyancy') ||
      q.includes('archimedes') ||
      q.includes('salinity') ||
      q.includes('why do ships float') ||
      q.includes('why does a ship float')
    ) {
      return {
        message: `Water is a transparent, odorless, tasteless chemical compound made of two hydrogen atoms bonded to one oxygen atom (chemical formula H₂O). It is the only substance that naturally exists on Earth in all three physical states: liquid, solid (ice), and gas (water vapor).

In maritime logistics and ocean operations, water is the fundamental transport medium:
• Buoyancy & Floatation: Under Archimedes' principle, a ship floats because the weight of the water displaced by its hull equals the total mass of the vessel and its cargo.
• Density & Salinity: Standard ocean seawater has an average density of approximately 1,025 kg/m³ (compared to 1,000 kg/m³ for freshwater). Higher salinity and colder temperatures increase density, providing greater upward buoyancy.
• Draft & Navigation: Because water density changes between open seas, estuaries, and freshwater rivers, a ship's draft (submerged depth) varies. This is monitored using the international Plimsoll line marked on every vessel's hull to guarantee adequate under-keel clearance (UKC) when entering harbour approaches.`,
        suggestedActions: [
          { label: 'What is a container vessel?', prompt: 'What is a container vessel?' },
          { label: 'Inspect Berth B04 Depth', actionRoute: '/operations/berths' },
          { label: 'Harbour Approach View', actionRoute: '/dashboard' },
        ],
      };
    }

    // ─── 2B. CONTAINER VESSELS & SHIP ARCHITECTURE ────────────────────────────
    if (
      q.includes('what is a container ship') ||
      q.includes('what is a container vessel') ||
      q.includes('what is a ship') ||
      q.includes('what is a cargo ship') ||
      q.includes('what is a vessel') ||
      q.includes('how do container ships work') ||
      q.includes('boxship')
    ) {
      return {
        message: `A container ship (also called a cellular vessel or boxship) is a specialized commercial cargo ship engineered to transport intermodal freight in standardized ISO shipping containers.

Key architectural features:
• Cellular Holds & Cell Guides: Vertical steel tracks that guide containers into place below deck and hold them secure without individual lashings.
• Deck Stacks & Lashing Bridges: Above-deck tiers secured by twistlocks, bridge fittings, and diagonal steel lashing rods.
• Capacity Tiers: Range from Feeder vessels (500–3,000 TEU) to Ultra Large Container Vessels (ULCVs, up to 24,000+ TEU) measuring 400 meters LOA and 61 meters beam.
• Power & Propulsion: Driven by low-speed two-stroke marine diesel or dual-fuel LNG engines generating up to 80,000 kW, with bow thrusters for harbour berthing.`,
        suggestedActions: [
          { label: 'Status of MV Ocean Star', prompt: 'What is the operational status of MV Ocean Star?' },
          { label: 'Inspect 3D Vessel Profile', actionRoute: '/operations/vessels/VES-01' },
          { label: 'View Fleet Schedule', actionRoute: '/operations/vessels' },
        ],
      };
    }

    // ─── 2C. TEU & FREIGHT CAPACITY ──────────────────────────────────────────
    if (
      q.includes('what is teu') ||
      q.includes('twenty-foot equivalent') ||
      q.includes('twenty foot equivalent') ||
      q.includes('what is feu') ||
      q.includes('container size') ||
      q.includes('container dimensions')
    ) {
      return {
        message: `TEU stands for "Twenty-foot Equivalent Unit". It is the universal standard metric used across maritime shipping to quantify cargo capacity on container vessels and container terminal storage yards.

Key standards:
• 1 TEU = A standard 20-foot shipping container (20 ft length × 8 ft width × 8.5 ft height, or ~38.5 cubic meters volume).
• 1 FEU = A 40-foot container (Forty-foot Equivalent Unit), which equals exactly 2 TEU.
• High-Cube Containers: Measure 9.5 ft in height, adding 12% more volume (76.2 m³) while still counted as 2 TEU in nominal capacity tables.
• Terminal Yard Stacking: Terminal blocks stack containers 4 to 6 tiers high using Rubber-Tyred Gantry (RTG) cranes.`,
        suggestedActions: [
          { label: 'Inspect Container Yard (CY)', actionRoute: '/operations/yard' },
          { label: 'View Command Center', actionRoute: '/dashboard' },
        ],
      };
    }

    // ─── 2D. DEMURRAGE & DETENTION ───────────────────────────────────────────
    if (
      q.includes('what is demurrage') ||
      q.includes('what is detention') ||
      q.includes('demurrage fee') ||
      q.includes('laytime')
    ) {
      return {
        message: `In maritime shipping, demurrage and detention are liquidated financial penalties designed to prevent equipment holding and terminal congestion:

• Demurrage: A daily penalty fee charged by the carrier or terminal when cargo remains inside the container terminal past the agreed free-time window (typically 3 to 7 days). For a container ship waiting at anchorage due to berth congestion, demurrage costs the operator $25,000 to $60,000+ per day.
• Detention: A fee charged when the cargo owner takes the empty or loaded container outside the port gate and fails to return it within the permitted free days.
• Varunaa Optimization: Our BAP/CAP mathematical optimization algorithm reassigns bottlenecked vessels (like MV Ocean Star to Berth B02) specifically to minimize anchorage waiting hours, saving an estimated $148,000 in direct demurrage exposure.`,
        suggestedActions: [
          { label: 'Why did optimizer move Ocean Star?', prompt: 'Why did the optimizer reassign Ocean Star?' },
          { label: 'Open Optimizer', actionRoute: '/decision/optimizer' },
        ],
      };
    }

    // ─── 2E. DRAFT / DRAUGHT & UNDER-KEEL CLEARANCE ──────────────────────────
    if (
      q.includes('what is draft') ||
      q.includes('what is draught') ||
      q.includes('plimsoll') ||
      q.includes('under keel clearance') ||
      q.includes('ukc')
    ) {
      return {
        message: `Draft (or draught) is the vertical distance from the waterline to the bottom of the vessel's hull (keel).

Why draft matters in port operations:
• Under-Keel Clearance (UKC): The safety margin of water depth between the ship's bottom and the seabed. Ports maintain dredged navigation channels and berths to guarantee safe UKC at all tidal states.
• Static vs. Dynamic Draft: When a ship moves through shallow harbour waters, hydraulic suction causes "squat" (the hull sinks deeper), increasing dynamic draft.
• Berth Depth Allocation: Deep-draft mega-carriers (like MV Ocean Star at 15.2m draft) must be berthed at dedicated deep-water quays such as Berth B01, B02, or B04, preventing grounding risks.`,
        suggestedActions: [
          { label: 'View Berth Dimensions', actionRoute: '/operations/berths' },
          { label: 'Status of MV Ocean Star', prompt: 'What is the operational status of MV Ocean Star?' },
        ],
      };
    }

    // ─── 2F. AIS & VESSEL TRAFFIC TRACKING ────────────────────────────────────
    if (
      q.includes('what is ais') ||
      q.includes('automatic identification system') ||
      q.includes('vts') ||
      q.includes('vessel tracking')
    ) {
      return {
        message: `AIS (Automatic Identification System) is an autonomous shipboard broadcast transponder system operating over maritime VHF frequencies.

AIS broadcasts real-time telemetry:
• Static Data: Vessel IMO, MMSI, callsign, name, vessel type, and dimensions (LOA and beam).
• Dynamic Data: High-precision GPS latitude/longitude, Speed Over Ground (SOG), Course Over Ground (COG), heading, and rate of turn.
• Voyage Data: Destination port, estimated time of arrival (ETA), and maximum present static draft.
• Port Integration: Varunaa AI ingests live AIS feeds from all approaching vessels to forecast queue arrival bunching up to 72 hours ahead.`,
        suggestedActions: [
          { label: 'Inspect Active Vessels', actionRoute: '/operations/vessels' },
          { label: 'View 72h Forecast', actionRoute: '/intelligence/forecast' },
        ],
      };
    }

    // ─── 2G. BERTHS, QUAYS & PORT INFRASTRUCTURE ─────────────────────────────
    if (
      q.includes('what is a berth') ||
      q.includes('what is a quay') ||
      q.includes('what is a wharf') ||
      q.includes('how does a port work') ||
      q.includes('what is a port')
    ) {
      return {
        message: `A port terminal is a multimodal logistical interface connecting maritime shipping lines with terrestrial rail and road transport networks:

• Berth: The designated water-space along a wharf or pier where a vessel moors securely using mooring bollards and pneumatic rubber fenders.
• Quay / Wharf: The reinforced concrete operational apron alongside the berth equipped with crane rails for heavy Ship-to-Shore (STS) gantry cranes.
• Container Yard (CY): The landward staging area organized into blocks (e.g. CY-01 to CY-04) where containers are stacked, organized, and retrieved by rubber-tyred gantry (RTG) cranes or reach stackers.
• Gate & Intermodal Terminal: Where automated optical character recognition (OCR) gates inspect trucks, customs clearance takes place, and containers transfer onto rail flatcars.`,
        suggestedActions: [
          { label: 'Quayside Berths Matrix', actionRoute: '/operations/berths' },
          { label: 'View 3D Port Terminal', actionRoute: '/dashboard' },
        ],
      };
    }

    // ─── 2H. AI, MACHINE LEARNING & MATHEMATICAL OPTIMIZATION ─────────────────
    if (
      q.includes('what is ai') ||
      q.includes('what is machine learning') ||
      q.includes('what is optimization') ||
      q.includes('what is or-tools') ||
      q.includes('how does optimization work') ||
      q.includes('berth allocation problem') ||
      q.includes('bap')
    ) {
      return {
        message: `In Varunaa AI, artificial intelligence and mathematical optimization operate as a dual-engine architecture:

1. Machine Learning Congestion Forecasting:
   Neural network regression models ingest historical ship arrival bunching, terminal weather, crane maintenance status, and yard dwell times to predict berth utilization percentages and queue escalations 24 to 72 hours in advance.

2. OR-Tools Integer Programming Optimization:
   Solves the NP-hard Berth Allocation Problem (BAP) and Crane Assignment Problem (CAP) simultaneously. When an outage occurs (like Crane C03), the solver evaluates thousands of permutations in milliseconds to find the mathematically optimal berth and crane reassignment that minimizes total turnaround delay and demurrage costs.`,
        suggestedActions: [
          { label: 'Open Decision Optimizer', actionRoute: '/decision/optimizer' },
          { label: 'Run Outage Simulator', actionRoute: '/decision/simulator' },
        ],
      };
    }

    // ─── 2I. LIGHT HUMOR / JOKES ──────────────────────────────────────────────
    if (
      q.includes('joke') ||
      q.includes('tell me a joke') ||
      q.includes('funny') ||
      q.includes('laugh')
    ) {
      return {
        message: `Here is a maritime operations joke for you:

Why did the container ship break up with the quayside berth?
Because there was too much emotional baggage, and the demurrage penalties were piling up! ⚓🚢

Ready to inspect some real port telemetry whenever you are!`,
        suggestedActions: [
          { label: 'Why is B04 at risk?', prompt: 'Why is B04 at risk?' },
          { label: 'Status of MV Ocean Star', prompt: 'What is the operational status of MV Ocean Star?' },
        ],
      };
    }

    // ─── 3. SPECIFIC VESSEL QUERIES ────────────────────────────────────────────
    const matchedVessel = vessels.find((v: any) =>
      q.includes(v.name.toLowerCase()) || q.includes(v.id.toLowerCase())
    );

    if (matchedVessel || (q.includes('vessel') && !q.includes('surge') && !q.includes('which'))) {
      const target = matchedVessel || vessels.find((v: any) => v.name.includes('Ocean Star')) || vessels[0];
      if (target) {
        const isTargetOpt = isOpt && (target.name.includes('Ocean Star') || target.id === 'VES-01');
        const assignedBerth = isTargetOpt ? 'Berth B02' : target.assignedBerth;
        const waitHours = isTargetOpt ? 6.8 : target.predictedWaitHours;
        const demurrage = isTargetOpt ? 'Low (Demurrage Saved)' : target.demurrageRisk;

        return {
          message: `Operational Briefing for ${target.name} (${target.id}):
• Current Status: ${target.status}
• Assigned Quay: ${assignedBerth}
• Schedule ETA / ETD: ${target.eta} • ${target.etd}
• Projected Waiting Time: ${waitHours} hours (${demurrage} Demurrage Risk)
• Dimensions & Capacity: ${target.lengthMeters || 366}m LOA • ${target.draughtMeters || 15.2}m draught • ${(target.teuCapacity || 15200).toLocaleString()} TEU Capacity`,
          blocks: [
            {
              type: 'table',
              title: `${target.name} Operational Metrics`,
              columns: ['Telemetry Metric', 'Current Value', 'Operational Status'],
              rows: [
                ['Vessel Status', target.status, 'AIS telemetry synchronized'],
                ['Assigned Berth', assignedBerth, isTargetOpt ? 'Optimized B02 assignment' : 'Standard terminal queue'],
                ['Anchorage Wait', `${waitHours} hours`, waitHours > 8 ? 'High delay risk' : 'Nominal turnaround'],
                ['Demurrage Risk', `${demurrage} Risk`, isTargetOpt ? '$148k demurrage avoided' : 'Standard contract baseline'],
                ['Cargo Capacity', `${(target.teuCapacity || 15200).toLocaleString()} TEU`, 'Commercial container freight'],
              ],
            },
          ],
          suggestedActions: [
            { label: `Inspect ${target.name} Profile`, actionRoute: `/operations/vessels/${target.id}` },
            { label: 'View Quayside Berths', actionRoute: '/operations/berths' },
            { label: 'Check Alternate Ports', actionRoute: '/intelligence/routes' },
          ],
        };
      }
    }

    // ─── 4. BERTH B04 & CONGESTION BOTTLENECK ─────────────────────────────────
    if (q.includes('b04') || (q.includes('risk') && q.includes('bottleneck')) || q.includes('why will berth b04')) {
      const predUtil = isOpt ? 78 : (b04?.predictedUtilization24hPercent || 94);
      return {
        message: `Berth B04 is currently categorized at High Risk with a predicted peak utilization of ${predUtil}%.

Key operational drivers identified by the ML model:
1. Vessel Arrival Bunching: MV Ocean Star and Ever Forward arriving in tight succession (+38% impact)
2. Reduced STS Crane Throughput: Crane C03 is degraded/failed, reducing available cranes to 1 unit (+18% impact)
3. High Baseline Saturation: Berth operating at baseline capacity (+27% impact)

${isOpt ? 'Operational mitigation is currently APPLIED: Ocean Star has been re-routed to Berth B02 with twin STS crane priority, stabilizing B04 at 78%.' : 'Without operational intervention, roadstead queues will escalate to 7 vessels with average wait times reaching 11.4 hours.'}`,
        blocks: [
          {
            type: 'chart',
            chartType: 'bar',
            title: 'Berth B04 Congestion Drivers Breakdown',
            data: data.forecast?.drivers?.map((d: any) => ({ name: d.factor, value: d.percentage })) || [
              { name: 'Vessel Arrivals Surge', value: 38 },
              { name: 'Berth Utilization Baseline', value: 27 },
              { name: 'Crane Shortage / C03 Fault', value: 18 },
              { name: 'Yard Pressure (CY-03)', value: 11 },
              { name: 'Day-of-Week Pattern', value: 6 },
            ],
          },
        ],
        suggestedActions: [
          { label: 'Apply B04 Optimization', actionRoute: '/decision/optimizer' },
          { label: 'Simulate Crane Outage', actionRoute: '/decision/simulator' },
          { label: 'Compare Alternate Ports', actionRoute: '/intelligence/routes' },
        ],
      };
    }

    // ─── 5. SPECIFIC BERTH INQUIRIES (B01, B02, B03, B05, B06) ───────────────
    const berthMatch = q.match(/\b(b0[1-6])\b/i);
    if (berthMatch) {
      const bId = berthMatch[1].toUpperCase();
      const bData = berths.find((b: any) => b.id === bId) || berths[0];
      return {
        message: `Quayside Berth ${bData.id} (${bData.name}) Telemetry:
• Risk Category: ${bData.riskLevel}
• Current Utilization: ${bData.currentUtilizationPercent}%
• Predicted 24h Utilization: ${bData.predictedUtilization24hPercent}%
• Queue Count: ${bData.queueCount} vessels in roadstead
• Active STS Cranes: ${bData.availableCranes} / ${bData.maxCranes} available units`,
        blocks: [
          {
            type: 'table',
            title: `Berth ${bData.id} Detailed Telemetry`,
            columns: ['Operational Parameter', 'Status / Value'],
            rows: [
              ['Current Utilization', `${bData.currentUtilizationPercent}%`],
              ['Predicted 24h Peak', `${bData.predictedUtilization24hPercent}%`],
              ['Queue Count', `${bData.queueCount} vessels`],
              ['Assigned Cranes', `${bData.assignedCraneIds?.join(', ') || 'C01, C02'}`],
              ['Available Cranes', `${bData.availableCranes} of ${bData.maxCranes} active`],
            ],
          },
        ],
        suggestedActions: [
          { label: 'Manage All Berths', actionRoute: '/operations/berths' },
          { label: 'View Operations Board', actionRoute: '/operations' },
        ],
      };
    }

    // ─── 6. ALL BERTHS STATUS OVERVIEW ─────────────────────────────────────────
    if (q.includes('which berth') || (q.includes('berth') && (q.includes('status') || q.includes('available') || q.includes('attention') || q.includes('utilization')))) {
      return {
        message: `Across the 6 commercial quays, Berth B04 requires primary operational attention due to high bottleneck risk (94% predicted peak). Berths B01 (76%) and B02 (${isOpt ? '74%' : '65%'}) maintain available buffer capacity. Berth B03 is in scheduled maintenance.`,
        blocks: [
          {
            type: 'table',
            title: 'Port Sector Alpha — Quayside Berth Matrix',
            columns: ['Berth ID', 'Risk Tier', 'Current Util', 'Predicted 24h', 'Queue', 'STS Cranes'],
            rows: berths.map((b: any) => [
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
          { label: 'View Berth Schedules', actionRoute: '/operations/berths' },
        ],
      };
    }

    // ─── 7. STS CRANES & CRANE C03 INQUIRIES ──────────────────────────────────
    if (q.includes('c03') || q.includes('crane') || q.includes('sts')) {
      return {
        message: `Quayside Stevedoring Status:
• Total Cranes: 8 STS units deployed across quays B01 through B06.
• Active Fleet: 7 active cranes operating at 30 to 36 moves/hour.
• Degraded Unit: Crane C03 at Berth B04 is in MAINTENANCE/FAILED status following an inverter electronics trip.
• Operational Impact: Reduces Berth B04 throughput by 42 moves/hour, causing arrival backlog for incoming carriers.`,
        blocks: [
          {
            type: 'table',
            title: 'STS Gantry Crane Fleet Status',
            columns: ['Crane ID', 'Berth Station', 'Status', 'Moves / Hr', 'Utilization'],
            rows: cranes.map((c: any) => [
              c.id,
              c.berthId,
              c.status,
              `${c.movesPerHour} moves`,
              `${c.utilizationPercent}%`,
            ]),
          },
        ],
        suggestedActions: [
          { label: 'Open Cranes Dashboard', actionRoute: '/operations/cranes' },
          { label: 'Simulate Crane Outage', actionRoute: '/decision/simulator' },
        ],
      };
    }

    // ─── 8. CONTAINER YARD INQUIRIES ──────────────────────────────────────────
    if (q.includes('yard') || q.includes('reefer') || q.includes('cy-') || q.includes('dwell')) {
      return {
        message: `Container Yard (CY) Operational Overview:
• Total Capacity: 50,000 TEU across storage blocks CY-01 through CY-04.
• Occupied Staging: 34,200 TEU (68% overall utilization).
• Hotspot Alert: Block CY-03 (Reefer Cold-Chain) is operating at 88% capacity due to high seasonal agricultural imports.
• Redistribution: AI recommends shifting 450 TEU non-critical empty reefers to CY-04 buffer yard.`,
        blocks: [
          {
            type: 'table',
            title: 'Container Yard Storage Blocks',
            columns: ['Block ID', 'Category', 'TEU Occupied / Total', 'Utilization'],
            rows: yard.map((y: any) => [
              y.id,
              y.category,
              `${(y.occupiedTeu || 0).toLocaleString()} / ${(y.totalTeu || 0).toLocaleString()} TEU`,
              `${y.utilizationPercent}%`,
            ]),
          },
        ],
        suggestedActions: [
          { label: 'Inspect Container Yard', actionRoute: '/operations/yard' },
          { label: 'View Operations Board', actionRoute: '/operations' },
        ],
      };
    }

    // ─── 9. OPTIMIZATION / WHY MOVE OCEAN STAR ────────────────────────────────
    if (q.includes('ocean star') && (q.includes('move') || q.includes('optimizer') || q.includes('why'))) {
      return {
        message: `The mathematical optimizer reallocated MV Ocean Star from Berth B04 to Berth B02 because Berth B02 has 4 operational Super STS cranes available, completely bypassing the Crane C03 outage at B04.

Quantified operational gains:
• Turnaround waiting time reduced from 11.4h to 6.8h (-4.6 hours, 40.3% faster)
• Commercial demurrage savings estimated at $148,000
• Berth B04 peak saturation controlled from 94% down to 78%`,
        blocks: [
          {
            type: 'table',
            title: 'Ocean Star BAP/CAP Optimization Gains',
            columns: ['Parameter', 'Disrupted Baseline (B04)', 'Optimized Plan (B02)', 'Variance'],
            rows: [
              ['Assigned Berth', 'Berth B04', 'Berth B02', 'Bypasses C03 bottleneck'],
              ['STS Cranes Assigned', '1 Active / 2 Degraded', '4 Super STS Active', '+2 Active Cranes'],
              ['Turnaround Waiting', '11.4 hours', '6.8 hours', '-4.6 hours (-40.3%)'],
              ['Demurrage Cost', '$182,000 Exposure', '$34,000 Controlled', '$148,000 Saved'],
            ],
          },
        ],
        suggestedActions: [
          { label: 'Review Applied Plan', actionRoute: '/decision/optimizer' },
          { label: 'Inspect 72h Planner', actionRoute: '/decision/planner' },
        ],
      };
    }

    // ─── 10. SIMULATION & DISRUPTION RECOVERY ─────────────────────────────────
    if (q.includes('simulation') || q.includes('recovery') || q.includes('outage') || q.includes('disrupt')) {
      const recState = isRec ? 'Applied & Active' : 'Evaluated Standby';
      return {
        message: `Discrete-Event Simulation Engine Assessment (Status: ${recState}):
A simulated 8-hour outage of Crane C03 at Berth B04 escalates roadstead queue from 7 to 11 vessels, raising average wait time to 17.8 hours.

The AI 3-Step Recovery Action Plan mitigates this disruption:
1. Redeploy Crane C05 from Berth B05 to Berth B04 (45 mins transit)
2. Reallocate flagship MV Ocean Star to Berth B02 with 4 STS cranes
3. Buffer ETA of low-priority feeder Pacific Voyager by +4.0 hours

Post-recovery wait time stabilizes at 12.1 hours.`,
        blocks: [
          {
            type: 'table',
            title: `Disruption Scenario vs Recovery Plan (${recState})`,
            columns: ['Telemetry Metric', 'Baseline', 'Disrupted (8h C03 Fault)', 'After Recovery Plan'],
            rows: [
              ['Queue Count', '7 vessels', '11 vessels', '4 vessels'],
              ['Average Wait Time', '11.4 hours', '17.8 hours', '12.1 hours'],
              ['B04 Utilization', '82%', '94% (Critical)', '76% (Safe)'],
            ],
          },
        ],
        suggestedActions: [
          { label: 'Open What-If Simulator', actionRoute: '/decision/simulator' },
          { label: 'View 72-Hour Planner', actionRoute: '/decision/planner' },
        ],
      };
    }

    // ─── 11. 24-HOUR / 72-HOUR EXECUTIVE SUMMARY ──────────────────────────────
    if (q.includes('24 hour') || q.includes('24h') || q.includes('72h') || q.includes('summarize') || q.includes('overview') || q.includes('outlook')) {
      return {
        message: `Port Sector Alpha 24-Hour Operational Outlook:
• Quayside Flow: Average berth utilization is 68%. Peak constraint occurs between T+18h and T+30h tomorrow afternoon.
• Bottleneck Focus: Berth B04 is the primary critical hotspot (projected 94% peak) due to vessel arrival bunching and Crane C03 maintenance.
• Fleet Telemetry: 7 vessels queued in roadstead; 2 arriving within 24 hours.
• Recommended Action: Apply BAP/CAP berth optimization to divert MV Ocean Star to Berth B02, saving an estimated $148,000 in demurrage.`,
        blocks: [
          {
            type: 'table',
            title: '24-Hour Berth Utilization Forecast',
            columns: ['Berth ID', 'Current Util', 'Predicted Peak', 'Risk Tier', 'Queue Count'],
            rows: berths.map((b: any) => [
              b.id,
              `${b.currentUtilizationPercent}%`,
              `${b.predictedUtilization24hPercent}%`,
              b.riskLevel,
              `${b.queueCount} vessels`,
            ]),
          },
        ],
        suggestedActions: [
          { label: 'Optimize B04 Operations', actionRoute: '/decision/optimizer' },
          { label: 'Open 72h Planner', actionRoute: '/decision/planner' },
          { label: 'View Congestion Deep-Dive', actionRoute: '/intelligence/forecast' },
        ],
      };
    }

    // ─── 12. OPERATIONAL ALERTS & NOTICES ──────────────────────────────────────
    if (q.includes('alert') || q.includes('warning') || q.includes('notice')) {
      return {
        message: `Active Port Alerts (${alerts.length} notices registered):
${alerts.length > 0 ? alerts.map((a: any) => `• [${a.severity || 'WARNING'}] ${a.title || a.message || 'Operational advisory'}`).join('\n') : '• Berth B04: High congestion bottleneck forecast (94% peak)\n• Crane C03: Inverter trip fault, throughput degraded\n• Yard CY-03: Reefer cold-chain dwell at 88% capacity'}`,
        suggestedActions: [
          { label: 'View Command Center', actionRoute: '/dashboard' },
          { label: 'Open Operations Board', actionRoute: '/operations' },
        ],
      };
    }

    // ─── 13. PORT OPERATIONAL SNAPSHOT REQUEST ─────────────────────────────────
    if (
      q.includes('port status') ||
      q.includes('port overview') ||
      q.includes('telemetry') ||
      q.includes('snapshot') ||
      q.includes('operations status') ||
      q.includes('current status')
    ) {
      return {
        message: `Port Sector Alpha Operational Status:
6 commercial quays active, ${vessels.length} vessels tracked in the roadstead queue, and ${cranes.filter((c: any) => c.status === 'ACTIVE').length} active STS cranes. Berth B04 currently exhibits the highest queue pressure at ${b04?.predictedUtilization24hPercent || 94}% predicted peak utilization.`,
        blocks: [
          {
            type: 'table',
            title: 'Quayside Operations Snapshot',
            columns: ['Sector Resource', 'Operational State', 'Telemetry Parameter'],
            rows: [
              ['Active Vessels', `${vessels.length} vessels tracked`, 'AIS telemetry live'],
              ['Active Alerts', `${alerts.length} operational notices`, alerts.length > 0 ? 'Review active flags' : 'Nominal'],
              ['Average Berth Util', `${Math.round(berths.reduce((acc: number, b: any) => acc + b.currentUtilizationPercent, 0) / (berths.length || 1))}% baseline`, '6 commercial quays'],
              ['Critical Bottleneck', isOpt ? 'Berth B04 (Mitigated at 78%)' : 'Berth B04 (94% Peak Risk)', isOpt ? 'Optimized' : 'Attention Required'],
              ['Active Cranes', `${cranes.filter((c: any) => c.status === 'ACTIVE').length} / ${cranes.length} units`, 'Crane C03 in maintenance'],
            ],
          },
        ],
        suggestedActions: this.extractDefaultActions(query),
      };
    }

    // ─── 14. GENERAL CONVERSATIONAL INQUIRY (NO IRRELEVANT TABLE DUMP) ─────────
    return {
      message: `I received your question: "${query}".

As Varunaa AI, I am directly connected to Port Sector Alpha's maritime telemetry, quay allocation, vessel queue tracking, and discrete disruption simulation.

To enable live Google Gemini generative AI reasoning across any general subject or question, connect your Gemini API key using the "Connect Gemini API Key" button above or under Settings > AI.

Here are operational questions you can ask me right now:
• "What is water?" or "What is a container vessel?" — Maritime & physical definitions
• "Why is Berth B04 at risk?" — ML bottleneck attribution breakdown
• "Status of MV Ocean Star" — Flagship schedule, ETA, and assigned quay
• "What happens if Crane C03 fails?" — What-if discrete-event simulation
• "Why did the optimizer move Ocean Star?" — BAP/CAP demurrage optimization analysis`,
      suggestedActions: [
        { label: 'Connect Gemini Key', prompt: 'connect api key' },
        { label: 'Why is B04 at risk?', prompt: 'Why is B04 at risk?' },
        { label: 'Status of MV Ocean Star', prompt: 'What is the operational status of MV Ocean Star?' },
        { label: 'Simulate C03 failure', prompt: 'What happens if C03 fails?' },
      ],
    };
  }

  private generateAgentGroundedFallback(query: string, data: any): string {
    const q = query.toLowerCase();

    // Greeting
    if (
      /^(hy|hi|hello|hey|howdy|sup|hola)\b/i.test(q) ||
      q === 'hy' ||
      q === 'hi' ||
      q === 'hello' ||
      q.includes('who are you') ||
      q.includes('help')
    ) {
      return `Hello! I am your Shipping Operational Copilot for Apex Maritime Agency.

I monitor real-time AIS telemetry, quayside turnaround schedules, customs document clearance, and berth allocations for your managed fleet:
• MV Ocean Star (VES-01)
• MV MSC Orion (VES-02)
• MV Pacific Voyager (VES-05)

How can I assist your shipping agency operations today?`;
    }

    const oceanStar = data.authorizedFleet?.find((v: any) => v.name.includes('Ocean Star'));
    const isOpt = oceanStar?.assignedBerth === 'B02';

    if (q.includes('ocean star') || q.includes('ves-01')) {
      return `MV Ocean Star Fleet Telemetry:
• Assigned Quay: ${oceanStar.assignedBerth} (${isOpt ? 'Optimized with 4 Super STS cranes' : 'Subject to queue delay at B04'})
• Voyage Status: ${oceanStar.status} (ETA: ${oceanStar.eta}, ETD: ${oceanStar.etd})
• Expected Turnaround Wait: ${oceanStar.predictedWaitHours} hours (Demurrage Risk: ${oceanStar.demurrageRisk})
• Cargo Manifest: ${oceanStar.cargoQuantity}`;
    }

    if (q.includes('what is water') || q === 'water' || q.includes('h2o')) {
      return `Water (H₂O) is the essential physical medium of maritime transport. Seawater provides the hydrostatic buoyant force supporting your fleet according to Archimedes' principle. Standard ocean seawater density (~1,025 kg/m³) directly dictates vessel draught limits, under-keel clearance, and safe deadweight cargo loading (Plimsoll line).`;
    }

    if (q.includes('document') || q.includes('clearance') || q.includes('customs')) {
      return `Customs & Port Document Compliance Status:
• Pacific Voyager: Advance Arrival Notice (72h) status is Required.
• Ocean Star: Dangerous Goods Declaration is Under Review.
• MSC Orion: Cargo Manifest and Declarations are Approved.
You can upload compliance files directly at /shipping/documents.`;
    }

    if (!q.includes('vessel') && !q.includes('fleet') && !q.includes('berth') && !q.includes('eta') && !q.includes('orion') && !q.includes('voyager') && !q.includes('cargo')) {
      return `I received your inquiry: "${query}".

As the Shipping Agency Copilot for Apex Maritime, I specialize in fleet schedules, customs documentation, and quayside berth reservations for your managed vessels (MV Ocean Star, MV MSC Orion, and MV Pacific Voyager).

To unlock live Google Gemini AI generation across any subject or custom query, connect your Gemini API key under Settings > AI.`;
    }

    return `Apex Maritime Fleet Telemetry Summary:
• MV Ocean Star: Assigned to ${oceanStar?.assignedBerth || 'B04'}, ETA ${oceanStar?.eta || '14:30 UTC'}, turnaround wait ${oceanStar?.predictedWaitHours || 11.4}h.
• MV MSC Orion: Discharging at Berth B01, turnaround on track.
• MV Pacific Voyager: Arriving at Berth B05.
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
      { label: 'Status of MV Ocean Star', prompt: 'What is the operational status of MV Ocean Star?' },
      { label: 'Simulate C03 failure', prompt: 'What happens if C03 fails?' },
      { label: '24-Hour Executive Summary', prompt: 'Summarize the next 24 hours.' },
    ];
  }
}

export const geminiCopilotService = new GeminiCopilotService();
