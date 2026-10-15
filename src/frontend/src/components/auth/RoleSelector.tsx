import React from 'react';
import { Ship, Anchor, ArrowRight } from 'lucide-react';
import { UserRole } from '../../types/auth';

interface RoleSelectorProps {
  onSelectRole: (role: UserRole) => void;
  userName?: string;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelectRole, userName }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-surface border border-border-subtle rounded-xl shadow-modal p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50 text-brand-teal mb-1">
            <Ship className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-text-main tracking-tight">
            How will you use Varunaa AI?
          </h2>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            {userName ? `Welcome, ${userName}. ` : ''}
            Select your operational role to access the dedicated workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option 1: Port Operations (Admin) */}
          <div
            onClick={() => onSelectRole('admin')}
            className="p-5 rounded-lg border border-border-subtle hover:border-brand-teal hover:bg-teal-50/20 transition-all cursor-pointer flex flex-col justify-between space-y-4 group shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-brand-teal flex items-center justify-center group-hover:bg-brand-teal group-hover:text-white transition-colors">
                <Ship className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-text-main group-hover:text-brand-teal transition-colors">
                Port Operations
              </h3>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Control center, berth & crane allocations, disruption simulations, and automated recovery.
              </p>
            </div>

            <button
              type="button"
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-white bg-brand-teal hover:bg-teal-700 transition-all flex items-center justify-center gap-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <span>Port Operations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Option 2: Ship Agent */}
          <div
            onClick={() => onSelectRole('ship-agent')}
            className="p-5 rounded-lg border border-border-subtle hover:border-sky-500 hover:bg-sky-50/20 transition-all cursor-pointer flex flex-col justify-between space-y-4 group shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <Anchor className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-text-main group-hover:text-sky-700 transition-colors">
                Ship Agent
              </h3>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Track assigned fleet ETAs, live berth windows, expected delays, and port turnaround alerts.
              </p>
            </div>

            <button
              type="button"
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-all flex items-center justify-center gap-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <span>Ship Agent</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="text-center">
          <span className="text-[11px] text-text-caption">
            Role can be switched anytime from your profile settings.
          </span>
        </div>
      </div>
    </div>
  );
};

