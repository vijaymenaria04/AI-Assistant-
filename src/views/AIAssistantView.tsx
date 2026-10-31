import React, { useEffect, useState } from 'react';
import { Mic, Sparkles, Send, CheckCircle2, RefreshCw, Building2 } from 'lucide-react';
import { db } from '../services/db';
import { aiAgent } from '../services/aiAgent';
import { BusinessId, BUSINESSES } from '../types/database';
import { useTranslation } from '../services/i18n';

interface AIAssistantViewProps {
  currentBusinessId: BusinessId;
  onOpenVoiceOrb: () => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  currentBusinessId,
  onOpenVoiceOrb
}) => {
  const { t } = useTranslation();
  const [selectedWorkspace, setSelectedWorkspace] = useState<BusinessId>(currentBusinessId);
  const [history, setHistory] = useState<any[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadHistory = async () => {
    const list = await db.getAICommandHistory();
    setHistory(list);
  };

  useEffect(() => {
    setSelectedWorkspace(currentBusinessId);
  }, [currentBusinessId]);

  useEffect(() => {
    loadHistory();
    const unsub = db.subscribe(loadHistory);
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;

    const cmd = textInput.trim();
    setTextInput('');
    setIsProcessing(true);

    try {
      const { result } = await aiAgent.processCommand(cmd, selectedWorkspace);
      await aiAgent.executeAction(result);
      await loadHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-28">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-yellow-500/15 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/60 border border-amber-500/30 flex items-center justify-between shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Sparkles className="w-4 h-4 animate-spin text-amber-500" />
            <span>GopalAI Intelligent Agent</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{t('aiCommandCenter')}</h1>
          <p className="text-xs text-slate-700 dark:text-slate-300">Hindi, English & Hinglish Voice Command Automation</p>
        </div>
        <button
          onClick={onOpenVoiceOrb}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition"
        >
          <Mic className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Workspace Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'jain-sweets', name: 'Jain Sweets', color: 'text-amber-500' },
          { id: 'paan-bai', name: 'Paan Bai Canteen', color: 'text-emerald-500' },
          { id: 'kesarwadi', name: 'Kesarwadi Canteen', color: 'text-orange-500' },
          { id: 'gopal-caterers', name: 'Gopal Caterers', color: 'text-purple-500' },
          { id: 'personal', name: 'Personal Wallet', color: 'text-blue-500' }
        ].map((biz) => {
          const isActive = selectedWorkspace === biz.id;
          return (
            <button
              key={biz.id}
              onClick={() => setSelectedWorkspace(biz.id as BusinessId)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : biz.color}`} />
              <span>{biz.name}</span>
            </button>
          );
        })}
      </div>

      {/* Command Input Box */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={`Type Hinglish command for ${BUSINESSES[selectedWorkspace]?.name} (e.g. '5000 sale add karo')...`}
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={!textInput.trim() || isProcessing}
          className="py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs disabled:opacity-50 shadow-md"
        >
          {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {/* History Log */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('commandHistoryLog')}</div>
        {history.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500 shadow-sm">
            {t('noHistoryYet')}
          </div>
        ) : (
          history.slice().reverse().map((h) => (
            <div key={h.id} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-600 dark:text-amber-400">"{h.rawCommand || h.action}"</span>
                <span className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{h.speechResponse}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
