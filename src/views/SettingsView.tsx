import React, { useEffect, useState } from 'react';
import {
  Settings,
  Shield,
  Moon,
  Sun,
  Lock,
  Volume2,
  Database,
  Trash2,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Fingerprint,
  Globe,
  Mic,
  Bell,
  Cloud,
  Download,
  Upload,
  AlertTriangle,
  FileSpreadsheet,
  KeyRound,
  Sliders,
  ShieldAlert,
  Info
} from 'lucide-react';
import { db } from '../services/db';
import { AppSettings } from '../types/database';
import { useTranslation } from '../services/i18n';
import { androidAutomation } from '../services/androidAutomation';

interface SettingsViewProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onDataReset: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onToggleTheme,
  onDataReset
}) => {
  const { t, lang, setLanguage } = useTranslation();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Form states
  const [ownerName, setOwnerName] = useState('Gopal');
  const [ownerPhone, setOwnerPhone] = useState('+91 98765 43210');
  const [ownerEmail, setOwnerEmail] = useState('gopal@business.com');

  const [pinInput, setPinInput] = useState('');
  const [pinEnabled, setPinEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinSavedMsg, setPinSavedMsg] = useState(false);

  // Voice preferences
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [continuousVoice, setContinuousVoice] = useState(false);

  // Notifications & Background
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [stockAlertsEnabled, setStockAlertsEnabled] = useState(true);
  const [paymentAlertsEnabled, setPaymentAlertsEnabled] = useState(true);
  const [backgroundTasksEnabled, setBackgroundTasksEnabled] = useState(true);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(true);

  // Import/Export Status
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    db.getSettings().then((s) => {
      setSettings(s);
      if (s) {
        setOwnerName(s.ownerName || 'Gopal');
        setOwnerPhone(s.ownerPhone || '+91 98765 43210');
        setOwnerEmail(s.ownerEmail || 'gopal@business.com');
        setPinEnabled(s.pinEnabled ?? true);
        setPinInput(s.pinHash || '1234');
        setBiometricEnabled(s.biometricEnabled ?? false);
        setTtsEnabled(s.ttsEnabled ?? true);
        setVoiceGender(s.voiceGender || 'female');
        setVoiceSpeed(s.voiceSpeed || 1.0);
        setContinuousVoice(s.continuousVoiceEnabled ?? false);
        setNotificationsEnabled(s.notificationsEnabled ?? true);
        setStockAlertsEnabled(s.stockAlertsEnabled ?? true);
        setPaymentAlertsEnabled(s.paymentAlertsEnabled ?? true);
        setBackgroundTasksEnabled(s.backgroundTasksEnabled ?? true);
        setCloudSyncEnabled(s.cloudSyncEnabled ?? true);
      }
    });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.saveSettings({
      ownerName,
      ownerPhone,
      ownerEmail
    });
    setPinSavedMsg(true);
    setTimeout(() => setPinSavedMsg(false), 2000);
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length === 4) {
      await db.saveSettings({
        pinHash: pinInput,
        pinEnabled,
        biometricEnabled
      });
      setPinSavedMsg(true);
      setTimeout(() => setPinSavedMsg(false), 2000);
    }
  };

  const handleUpdateVoiceSettings = async (updates: Partial<AppSettings>) => {
    if (updates.ttsEnabled !== undefined) setTtsEnabled(updates.ttsEnabled);
    if (updates.voiceGender !== undefined) setVoiceGender(updates.voiceGender);
    if (updates.voiceSpeed !== undefined) setVoiceSpeed(updates.voiceSpeed);
    if (updates.continuousVoiceEnabled !== undefined) setContinuousVoice(updates.continuousVoiceEnabled);

    await db.saveSettings(updates);
  };

  const handleUpdateNotificationSettings = async (updates: Partial<AppSettings>) => {
    if (updates.notificationsEnabled !== undefined) setNotificationsEnabled(updates.notificationsEnabled);
    if (updates.stockAlertsEnabled !== undefined) setStockAlertsEnabled(updates.stockAlertsEnabled);
    if (updates.paymentAlertsEnabled !== undefined) setPaymentAlertsEnabled(updates.paymentAlertsEnabled);
    if (updates.backgroundTasksEnabled !== undefined) setBackgroundTasksEnabled(updates.backgroundTasksEnabled);
    if (updates.cloudSyncEnabled !== undefined) setCloudSyncEnabled(updates.cloudSyncEnabled);

    await db.saveSettings(updates);
  };

  const handleExportJSON = async () => {
    const jsonStr = await db.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GopalAI_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    androidAutomation.playSoundEffect('success');
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = await db.importDatabaseJSON(content);
        if (success) {
          setImportStatus('Database restored successfully!');
          androidAutomation.playSoundEffect('success');
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          setImportStatus('Failed to parse backup JSON file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = async () => {
    if (
      window.confirm(
        'CRITICAL WARNING: Are you sure you want to clear ALL database records? This action cannot be undone!'
      )
    ) {
      await db.clearAllData();
      onDataReset();
    }
  };

  return (
    <div className="p-4 space-y-5 max-w-4xl mx-auto pb-24">
      {/* Title */}
      <div>
        <h1 className="text-lg font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <span>{t('settingsTitle')}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('preferencesSecurity')}</p>
      </div>

      {/* 1. Owner Profile Card */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 space-y-3 shadow-xs">
        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>Owner Profile & Contact Info</span>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Owner Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Phone Contact
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="py-2 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-xs"
          >
            Save Profile
          </button>
        </form>
      </div>

      {/* 2. PIN & Biometric Security */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Security, PIN & Biometric Access</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100">4-Digit Security PIN Lock</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Require PIN code on app startup</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pinEnabled}
                onChange={(e) => {
                  setPinEnabled(e.target.checked);
                  db.saveSettings({ pinEnabled: e.target.checked });
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <form onSubmit={handleSavePin} className="flex gap-2">
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter new 4-digit PIN (e.g. 1234)"
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={pinInput.length !== 4}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs disabled:opacity-50 shadow-xs"
            >
              Update PIN
            </button>
          </form>

          {/* Biometric Authentication */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-amber-500" />
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">Android Fingerprint / Biometric</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Unlock app using Android device biometrics</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={biometricEnabled}
                onChange={(e) => {
                  setBiometricEnabled(e.target.checked);
                  db.saveSettings({ biometricEnabled: e.target.checked });
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>

        {pinSavedMsg && (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      {/* 3. Appearance & Language */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Theme */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Appearance Theme</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Current: {theme.toUpperCase()} Mode</div>
          </div>
          <button
            onClick={onToggleTheme}
            className="py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-600 dark:text-amber-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            <span>Toggle</span>
          </button>
        </div>

        {/* Language */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">App Translation Language</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Hindi / English / Hinglish</div>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs font-bold gap-1 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setLanguage('hi')}
              className={`px-2.5 py-1 rounded-lg transition ${
                lang === 'hi' ? 'bg-amber-500 text-slate-950' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              हिंदी
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-lg transition ${
                lang === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>

      {/* 4. Voice Preferences */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <Mic className="w-4 h-4" />
          <span>GopalAI Voice Preferences</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100">Spoken Voice Confirmation (TTS)</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Speak AI responses back aloud</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ttsEnabled}
                onChange={(e) => handleUpdateVoiceSettings({ ttsEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Voice Gender Persona
              </label>
              <select
                value={voiceGender}
                onChange={(e) => handleUpdateVoiceSettings({ voiceGender: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="female">Female Voice (Natural Hindi/English)</option>
                <option value="male">Male Voice (Deep Voice Persona)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Speech Speed ({voiceSpeed}x)
              </label>
              <input
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={voiceSpeed}
                onChange={(e) => handleUpdateVoiceSettings({ voiceSpeed: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Notification & Background Controls */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <span>Notification & Background Permissions</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100">Android System Notifications</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Push alert banners even when minimized</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => handleUpdateNotificationSettings({ notificationsEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100">Background Task Manager</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Run background checks for stock alerts and payment reminders</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={backgroundTasksEnabled}
                onChange={(e) => handleUpdateNotificationSettings({ backgroundTasksEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 6. Cloud Sync & Data Backup */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span>Cloud Sync, Backup & Restore</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleExportJSON}
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 flex items-center gap-3 transition text-left"
          >
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Export JSON Backup</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Download offline database file</div>
            </div>
          </button>

          <label className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 flex items-center gap-3 transition text-left cursor-pointer">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Restore Backup</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Upload JSON backup file</div>
            </div>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>

        {importStatus && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {importStatus}
          </div>
        )}
      </div>

      {/* 7. Clear Database (Strict Zero Reset) */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-rose-500/30 space-y-2 shadow-xs">
        <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-500" />
          <span>Reset Database to Zero State</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Deletes all saved sales, expenses, inventory items, and suppliers across all 4 workspaces. Returns app to strict zero state.
        </p>
        <button
          onClick={handleClearAllData}
          className="py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/40 text-xs font-bold transition"
        >
          Clear All Database Records
        </button>
      </div>
    </div>
  );
};
