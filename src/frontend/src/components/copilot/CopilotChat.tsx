import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Sparkles,
  ArrowRight,
  Zap,
  KeyRound,
  X,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useOperations } from '../../context/OperationsContext';
import { CopilotMessageContent } from './CopilotMessageContent';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface CopilotChatProps {
  embedded?: boolean;
}

export const CopilotChat: React.FC<CopilotChatProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const {
    copilotMessages,
    sendCopilotMessage,
    isCopilotLoading,
    setIsCopilotOpen,
    applyOptimization,
    applyRecoveryPlan,
    showToast,
  } = useOperations();

  const [inputQuery, setInputQuery] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    type: 'optimization' | 'recovery';
    title: string;
    description: string;
    action: () => void;
  } | null>(null);

  const [hasApiKey, setHasApiKey] = useState(() => {
    try {
      const k = localStorage.getItem('gemini_api_key');
      return !!(k && !k.includes('your-') && !k.includes('todo') && k.length > 15);
    } catch {
      return false;
    }
  });
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    try {
      return localStorage.getItem('gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [showKeyText, setShowKeyText] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [copilotMessages, isCopilotLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() || isCopilotLoading) return;
    const q = inputQuery;
    setInputQuery('');
    await sendCopilotMessage(q);
  };

  const handleChipClick = async (prompt: string) => {
    if (isCopilotLoading) return;
    await sendCopilotMessage(prompt);
  };

  const handleActionClick = (action: { label: string; actionRoute?: string; prompt?: string; requiresConfirmation?: boolean }) => {
    if (action.prompt) {
      if (action.prompt === 'connect api key' || action.label.toLowerCase().includes('connect gemini')) {
        setIsKeyModalOpen(true);
        return;
      }
      handleChipClick(action.prompt);
      return;
    }

    const lowerLabel = action.label.toLowerCase();

    if (lowerLabel.includes('connect gemini') || lowerLabel.includes('api key')) {
      setIsKeyModalOpen(true);
      return;
    }

    // Check if action changes state directly
    if (lowerLabel.includes('apply optimization')) {
      setPendingAction({
        type: 'optimization',
        title: 'Apply Berth Optimization',
        description: 'Are you sure you want to execute the OR-Tools optimization plan to reassign Ocean Star to Berth B02?',
        action: () => {
          applyOptimization();
          setPendingAction(null);
        },
      });
      return;
    }

    if (lowerLabel.includes('apply recovery')) {
      setPendingAction({
        type: 'recovery',
        title: 'Apply AI Recovery Plan',
        description: 'Are you sure you want to execute the recovery plan (redeploy C05 to B04 and divert Ocean Star to B02)?',
        action: () => {
          applyRecoveryPlan();
          setPendingAction(null);
        },
      });
      return;
    }

    if (action.actionRoute) {
      navigate(action.actionRoute);
      if (!embedded) {
        setIsCopilotOpen(false);
      }
    }
  };

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      localStorage.removeItem('gemini_api_key');
      setHasApiKey(false);
      showToast('info', 'API Key Removed', 'Reverted to Varunaa local telemetry intelligence.');
      setIsKeyModalOpen(false);
      return;
    }
    if (trimmed.length < 15 || trimmed.includes('your-')) {
      showToast('error', 'Invalid API Key', 'Please enter a valid Google Gemini API key (starts with AIza...).');
      return;
    }
    localStorage.setItem('gemini_api_key', trimmed);
    setHasApiKey(true);
    showToast('success', 'Gemini API Key Connected', 'Live Google Gemini reasoning is now active for all inquiries.');
    setIsKeyModalOpen(false);
  };

  const quickChips = [
    'Why is B04 at risk?',
    'What happens if C03 fails?',
    'Why did the optimizer move Ocean Star?',
    'What changed after the recovery plan?',
    'Which berth needs attention?',
    'Summarize the next 24 hours.',
  ];

  return (
    <div className={`flex flex-col h-full bg-surface ${embedded ? 'rounded-3xl border border-border-subtle shadow-[0_8px_30px_rgb(0,0,0,0.04)]' : ''}`}>
      {/* AI Reasoning Engine Status Bar */}
      <div className="px-4 py-2 bg-surface-subtle/80 border-b border-border-subtle flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-brand-teal'}`} />
          <span className="font-semibold text-text-main text-[11px]">
            {hasApiKey ? 'Google Gemini 2.0 Live' : 'Varunaa Local Engine'}
          </span>
          <span className="text-text-muted text-[10px] hidden sm:inline">
            {hasApiKey ? '• Open-Domain & Port Intelligence' : '• Built-in Operational Knowledge'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsKeyModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-surface hover:bg-slate-100 text-text-main border border-border-subtle transition-colors shadow-xs cursor-pointer"
        >
          <KeyRound className="w-3 h-3 text-brand-teal" />
          <span>{hasApiKey ? 'Configure Key' : 'Connect Gemini API Key'}</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {copilotMessages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 text-xs leading-relaxed ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'gemini' && (
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-brand-teal flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[90%] rounded-xl p-4 space-y-3 ${
                msg.sender === 'user'
                  ? 'bg-slate-100 border border-slate-200 text-text-main font-medium'
                  : 'bg-surface border border-border-subtle text-text-main shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
              }`}
            >
              {/* Message content with clean Markdown, Tables & Charts */}
              <CopilotMessageContent message={msg} />

              {/* Suggested Actions within Gemini reply */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="pt-2 border-t border-border-subtle flex flex-wrap gap-1.5">
                  {msg.suggestedActions.map((act, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={() => handleActionClick(act)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-surface hover:bg-surface-subtle text-text-main border border-border-subtle transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-brand-teal" />
                      <span>{act.label}</span>
                      <ArrowRight className="w-3 h-3 text-text-caption ml-0.5" />
                    </button>
                  ))}
                </div>
              )}

              <div className="text-[10px] text-text-caption text-right">
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-surface border border-border-subtle text-text-main flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                OP
              </div>
            )}
          </div>
        ))}

        {isCopilotLoading && (
          <div className="flex gap-3 text-xs justify-start">
            <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-brand-teal flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="bg-surface border border-border-subtle rounded-xl p-3 flex items-center gap-2 text-text-muted text-xs shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
              <span>Analyzing port operations...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="p-3.5 border-t border-border-subtle bg-surface-subtle/50">
        <div className="text-xs text-text-muted mb-2 font-medium">
          Suggested Inquiries:
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(chip)}
              disabled={isCopilotLoading}
              className="px-2.5 py-1 rounded-xl bg-surface hover:bg-slate-100 text-text-main border border-border-subtle text-xs transition-colors text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <div className="p-3.5 border-t border-border-subtle bg-surface">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            placeholder="Ask about berths, queues, optimizer, or disruption simulation..."
            disabled={isCopilotLoading}
            className="flex-1 bg-surface-subtle border border-border-subtle rounded-lg px-3.5 py-2.5 text-xs text-text-main placeholder:text-text-caption focus:outline-hidden focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isCopilotLoading || !inputQuery.trim()}
            className="px-4 py-2.5 bg-brand-teal hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Confirmation Modal for State-Changing Operations */}
      <ConfirmationModal
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={() => pendingAction?.action()}
        title={pendingAction?.title || 'Confirm Operational Action'}
        description={pendingAction?.description || ''}
        confirmLabel="Execute Change"
        cancelLabel="Cancel"
        type="warning"
      />

      {/* Gemini API Key Connection Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-surface border border-border-subtle rounded-2xl shadow-modal p-6 space-y-5">
            <button
              onClick={() => setIsKeyModalOpen(false)}
              className="absolute top-4 right-4 text-text-caption hover:text-text-main transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-brand-teal flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-main">
                  Connect Google Gemini API
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Enter your Google Gemini API key to unlock full, open-domain generative AI reasoning (answering any question from &quot;what is water&quot; to complex multi-vessel berth optimization).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-text-main block">
                Google Gemini API Key
              </label>
              <div className="relative flex items-center">
                <input
                  type={showKeyText ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  className="w-full bg-surface-subtle border border-border-subtle rounded-xl px-3.5 py-2.5 text-xs text-text-main pr-10 focus:outline-hidden focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="absolute right-3 text-text-muted hover:text-text-main transition-colors cursor-pointer"
                >
                  {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                <span>Stored securely in your local browser storage</span>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-teal hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Get free key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              {hasApiKey ? (
                <button
                  type="button"
                  onClick={() => {
                    setApiKeyInput('');
                    localStorage.removeItem('gemini_api_key');
                    setHasApiKey(false);
                    showToast('info', 'Key Removed', 'Reverted to Varunaa local telemetry engine.');
                    setIsKeyModalOpen(false);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                >
                  Disconnect Key
                </button>
              ) : (
                <span className="text-[11px] text-text-caption">Status: Local telemetry mode</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-text-muted hover:text-text-main bg-surface-subtle hover:bg-slate-200 rounded-xl border border-border-subtle transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 rounded-xl transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
                >
                  Save &amp; Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

