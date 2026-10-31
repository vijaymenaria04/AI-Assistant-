import React, { useState } from 'react';
import { Smartphone, Download, Database, Upload, CheckCircle2, ShieldCheck, X, FileText } from 'lucide-react';
import { db } from '../services/db';

interface AndroidAPKModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported: () => void;
}

export const AndroidAPKModal: React.FC<AndroidAPKModalProps> = ({
  isOpen,
  onClose,
  onDataImported
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportBackup = async () => {
    const jsonStr = await db.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GopalAI_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setImportStatus('Backup exported successfully to JSON!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      const success = await db.importDatabaseJSON(content);
      if (success) {
        setImportStatus('Database restored successfully from file!');
        onDataImported();
      } else {
        setImportStatus('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 text-slate-100 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-amber-400 text-sm">Free Android App & Storage</div>
              <div className="text-[11px] text-slate-400">Offline PWA & Local Database Backup</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-5 space-y-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong>GopalAI Assistant</strong> runs as a full offline-capable Android Progressive Web App (PWA). You can install it on your mobile home screen without app store costs.
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
            <div className="font-bold text-amber-300">Android Install Options:</div>
            <div>• Tap browser menu <strong className="text-slate-200">⋮</strong> & select <strong className="text-amber-400">"Add to Home Screen"</strong> or <strong className="text-amber-400">"Install App"</strong>.</div>
            <div>• All records save locally in SQLite/IndexedDB with zero internet required.</div>
          </div>
        </div>

        {/* Export & Import Data Section */}
        <div className="space-y-3 mb-4">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-amber-400" />
            <span>Database Backup & Restore</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleExportBackup}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Export Backup</span>
            </button>

            <label className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-95">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Restore Data</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>

          {importStatus && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{importStatus}</span>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold text-xs hover:brightness-110 transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
