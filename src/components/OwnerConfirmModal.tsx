import { translateText } from '../services/i18n';
import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Check, X, Building2, PhoneCall, DollarSign } from 'lucide-react';
import { ParsedAgentResult, aiAgent } from '../services/aiAgent';
import { BUSINESSES } from '../types/database';

interface OwnerConfirmModalProps {
  pendingAction: ParsedAgentResult | null;
  onConfirm: (message: string) => void;
  onCancel: () => void;
}

export const OwnerConfirmModal: React.FC<OwnerConfirmModalProps> = ({
  pendingAction,
  onConfirm,
  onCancel
}) => {
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => { setError(null); }, [pendingAction]);
  if (!pendingAction) return null;

  const params = pendingAction.parameters || {};
  const busId = pendingAction.business_id || 'jain-sweets';
  const business = BUSINESSES[busId];

  const handleExecute = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setExecuting(true);
    setError(null);
    try {
      const message = await aiAgent.executeAction(pendingAction, true);
      onConfirm(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action could not be verified.');
    } finally {
      inFlight.current = false;
      setExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Top Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-500/30">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-amber-700 dark:text-amber-400 text-sm">{translateText("Owner Confirmation")}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{translateText("Action Verification Required")}</div>
          </div>
        </div>

        {/* Action Description */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{translateText("Action Type:")}</span>
            <span className="font-bold text-amber-700 dark:text-amber-300 uppercase">{pendingAction.action.replace('_', ' ')}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{translateText("Target Account:")}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{business?.name || busId}</span>
          </div>

          {params.amount !== undefined && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>{translateText("Amount:")}</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-base">₹{params.amount}</span>
            </div>
          )}

          {params.date && <div className="flex justify-between text-xs"><span>{translateText("Date")}</span><span>{params.date}</span></div>}
          {params.payment_method && <div className="flex justify-between text-xs"><span>{translateText("Payment Method")}</span><span>{params.payment_method}</span></div>}
          {params.category && <div className="flex justify-between text-xs"><span>{translateText("Category")}</span><span>{params.category}</span></div>}
          {params.transaction_type && <div className="flex justify-between text-xs"><span>{translateText("Type")}</span><span>{params.transaction_type}</span></div>}
          {params.reminder_title && <div className="flex justify-between text-xs"><span>{translateText("Reminder")}</span><span>{params.reminder_title}</span></div>}
          {params.reminder_time && <div className="flex justify-between text-xs"><span>{translateText("Time")}</span><span>{params.reminder_time}</span></div>}
          {params.phone_number && <div className="flex justify-between text-xs"><span>{translateText("Phone")}</span><span>{params.phone_number}</span></div>}
          {params.app_name && <div className="flex justify-between text-xs"><span>{translateText("App")}</span><span>{params.app_name}</span></div>}
          {params.query && <div className="flex justify-between text-xs"><span>{translateText("Search")}</span><span>{params.query}</span></div>}
          {params.location && <div className="flex justify-between text-xs"><span>{translateText("Location")}</span><span>{params.location}</span></div>}
          {params.item_name && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{translateText("Item / Goods:")}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{params.quantity || 1} {params.unit || ''} {params.item_name}</span>
            </div>
          )}

          {params.contact_name && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{translateText("Contact:")}</span>
              <span className="font-semibold text-amber-700 dark:text-amber-300">{params.contact_name}</span>
            </div>
          )}

          <div className="text-xs text-slate-700 dark:text-slate-300 pt-2 italic border-t border-slate-200 dark:border-slate-800/80">
            "{pendingAction.speech_response}"
          </div>
        </div>

        {error && <p role="alert" className="mb-4 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={executing}
            className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>{translateText("Cancel")}</span>
          </button>
          <button
            onClick={handleExecute}
            disabled={executing}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{executing ? translateText("Processing") : translateText("Confirm & Execute")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
