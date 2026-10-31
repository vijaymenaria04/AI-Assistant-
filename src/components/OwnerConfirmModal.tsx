import React from 'react';
import { ShieldAlert, Check, X, Building2, PhoneCall, DollarSign } from 'lucide-react';
import { ParsedAgentResult, aiAgent } from '../services/aiAgent';
import { BUSINESSES } from '../types/database';

interface OwnerConfirmModalProps {
  pendingAction: ParsedAgentResult | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const OwnerConfirmModal: React.FC<OwnerConfirmModalProps> = ({
  pendingAction,
  onConfirm,
  onCancel
}) => {
  if (!pendingAction) return null;

  const params = pendingAction.parameters || {};
  const busId = pendingAction.business_id || 'jain-sweets';
  const business = BUSINESSES[busId];

  const handleExecute = async () => {
    await aiAgent.executeAction(pendingAction);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Top Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-500/30">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-amber-400 text-sm">Owner Confirmation</div>
            <div className="text-[11px] text-slate-400">Action Verification Required</div>
          </div>
        </div>

        {/* Action Description */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Action Type:</span>
            <span className="font-bold text-amber-300 uppercase">{pendingAction.action.replace('_', ' ')}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Target Account:</span>
            <span className="font-semibold text-slate-200">{business?.name || busId}</span>
          </div>

          {params.amount !== undefined && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
              <span>Amount:</span>
              <span className="font-extrabold text-emerald-400 text-base">₹{params.amount}</span>
            </div>
          )}

          {params.item_name && (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Item / Goods:</span>
              <span className="font-semibold text-slate-200">{params.quantity || 1} {params.unit || ''} {params.item_name}</span>
            </div>
          )}

          {params.contact_name && (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Contact:</span>
              <span className="font-semibold text-amber-300">{params.contact_name}</span>
            </div>
          )}

          <div className="text-xs text-slate-300 pt-2 italic border-t border-slate-800/80">
            "{pendingAction.speech_response}"
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleExecute}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirm & Execute</span>
          </button>
        </div>
      </div>
    </div>
  );
};
