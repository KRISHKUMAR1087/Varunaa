import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Ship,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useOperations } from '../../context/OperationsContext';
import { useAuth } from '../../context/AuthContext';
import { geminiCopilotService } from '../../services/geminiCopilotService';
import { CopilotMessageContent } from '../../components/copilot/CopilotMessageContent';

import { CopilotMessage } from '../../types/operations';
export const ShippingCopilotPage: React.FC = () => {
  const { user } = useAuth();
  const {
    vessels,
    berths,
    isOptimizationApplied,
    isRecoveryPlanApplied,
    shippingDocuments,
    berthRequests,
  } = useOperations();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const oceanStar = vessels.find(v => v.id === 'VES-01') || vessels[0];
  const pacificVoyager = vessels.find(v => v.id === 'VES-05');

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init-1',
      sender: 'gemini',
      text: `Hello ${user?.name || 'Agent'}. I am your **Shipping Operational Copilot** at Varunaa.

I monitor AIS telemetry, quayside turnaround schedules, berth request approvals, and customs document compliance for your fleet (*Ocean Star*, *Pacific Voyager*, *MSC Orion*).

How can I assist your shipping operations today?`,
      timestamp: 'Just now',
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: CopilotMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC',
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput('');
    setIsLoading(true);

    try {
      const responseText = await geminiCopilotService.processShipAgentQuery(textToSend, {
        vessels,
        berths,
        shippingDocuments,
        berthRequests,
        isOptimizationApplied,
        isRecoveryPlanApplied,
        agentName: user?.name,
        conversationHistory: messages.map(m => ({ sender: m.sender, text: m.text })),
      });

      const aiMsg: CopilotMessage = {
        id: 'ai-' + Date.now(),
        sender: 'gemini',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC',
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Ship agent copilot query failed:', err);
      const fallbackMsg: CopilotMessage = {
        id: 'ai-err-' + Date.now(),
        sender: 'gemini',
        text: 'An error occurred while connecting to the Shipping Copilot service. Telemetry remains active.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC',
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    'What is the status of Ocean Star?',
    'Why was Ocean Star moved from B04 to B02?',
    'What documents are missing for my fleet?',
    'What is the current congestion risk across berths?',
    'When is Pacific Voyager expected to berth?',
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 min-w-0">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-600" />
            Shipping Operational Copilot
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Grounded operational intelligence for your assigned vessels, berthing schedules, and turnaround predictions.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted bg-surface px-3 py-1.5 rounded-xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Agency Scoped (Read-Only Port Authority Data)</span>
        </div>
      </div>

      {/* 2. Chat Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Cols: Copilot Conversation */}
        <div className="lg:col-span-3 bg-surface rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-[65vh] lg:h-full">
          {/* Messages stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'gemini' && (
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-xl p-3.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-sky-600 text-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
                      : 'bg-surface-subtle text-text-main border border-border-subtle shadow-xs'
                  }`}
                >
                  <CopilotMessageContent message={msg} />
                  <div
                    className={`text-[10px] mt-1.5 ${
                      msg.sender === 'user' ? 'text-sky-200' : 'text-text-caption'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-text-muted p-2">
                <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                <span>Analyzing port operations...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sample Prompts Pills */}
          <div className="px-4 py-2 bg-surface-subtle/50 border-t border-border-subtle flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-semibold text-text-muted uppercase shrink-0">
              Quick Inquiries:
            </span>
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-surface hover:bg-sky-50 text-text-muted hover:text-sky-900 border border-border-subtle transition-colors shrink-0 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3.5 border-t border-border-subtle bg-surface">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about Ocean Star's status, delay causes, missing documents, or berth assignments..."
                value={input}
                onChange={e => setInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-xs text-text-main focus:outline-hidden focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Context Panel */}
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-surface border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border-subtle text-xs font-bold text-text-main uppercase tracking-wider">
              <Ship className="w-3.5 h-3.5 text-sky-600" />
              <span>Grounded Fleet Context</span>
            </div>

            <div className="space-y-2 text-xs">
              {oceanStar ? (
                <div className="p-2 rounded bg-surface-subtle border border-border-subtle">
                  <div className="font-semibold text-text-main">{oceanStar.name}</div>
                  <div className="text-[10px] text-text-muted">
                    Berth {isOptimizationApplied ? 'B02 (Optimized)' : 'B04 (Congested)'} • Wait: {isOptimizationApplied ? '6.8h' : '11.4h'}
                  </div>
                </div>
              ) : (
                <div className="p-2 text-[10px] text-text-muted italic">
                  No active fleet data available.
                </div>
              )}

              {pacificVoyager && (
                <div className="p-2 rounded bg-surface-subtle border border-border-subtle">
                  <div className="font-semibold text-text-main">{pacificVoyager.name}</div>
                  <div className="text-[10px] text-text-muted">
                    ETA: {pacificVoyager.eta} • Berth B05
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-surface border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-text-main">
              <Info className="w-3.5 h-3.5 text-sky-600" />
              <span>Copilot Permissions</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              This assistant has read-access to your fleet's live AIS positions, turnaround calculations, and assigned quays. It cannot execute terminal-wide crane reallocation or administrative settings changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

