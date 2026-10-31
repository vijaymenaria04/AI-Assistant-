import { translateText } from '../services/i18n';
import React, { useEffect, useState } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Volume2,
  Trash2,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Globe,
  Mic,
  Bell
} from 'lucide-react';
import { db } from '../services/db';
import { voice } from '../services/voice';
import { AppSettings } from '../types/database';
import { useTranslation } from '../services/i18n';

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

  // Form states
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  const [profileSaved, setProfileSaved] = useState(false);

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

  useEffect(() => {
    db.getSettings().then((s) => {
      if (s) {
        setOwnerName(s.ownerName || '');
        setOwnerPhone(s.ownerPhone || '');
        setOwnerEmail(s.ownerEmail || '');
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
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleUpdateVoiceSettings = async (updates: Partial<AppSettings>) => {
    if (updates.ttsEnabled !== undefined) setTtsEnabled(updates.ttsEnabled);
    if (updates.voiceGender !== undefined) setVoiceGender(updates.voiceGender);
    if (updates.voiceSpeed !== undefined) setVoiceSpeed(updates.voiceSpeed);
    if (updates.continuousVoiceEnabled !== undefined) setContinuousVoice(updates.continuousVoiceEnabled);

    await db.saveSettings(updates);
    voice.setPreferences(updates.voiceSpeed, updates.voiceGender);
  };

  const handleUpdateNotificationSettings = async (updates: Partial<AppSettings>) => {
    if (updates.notificationsEnabled !== undefined) setNotificationsEnabled(updates.notificationsEnabled);
    if (updates.stockAlertsEnabled !== undefined) setStockAlertsEnabled(updates.stockAlertsEnabled);
    if (updates.paymentAlertsEnabled !== undefined) setPaymentAlertsEnabled(updates.paymentAlertsEnabled);
    if (updates.backgroundTasksEnabled !== undefined) setBackgroundTasksEnabled(updates.backgroundTasksEnabled);
    if (updates.cloudSyncEnabled !== undefined) setCloudSyncEnabled(updates.cloudSyncEnabled);

    await db.saveSettings(updates);
  };

  const handleClearAllData = async () => {
    if (
      window.confirm(
        'CRITICAL WARNING: Clear business and personal records? This cannot be undone. Settings and saved Poster Studio designs are not cleared.'
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
          <span>{t('ownerProfile')}</span>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('ownerName')}
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
                {t('phoneContactLabel')}
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
                {t('emailAddress')}
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
          >{translateText("Save Profile")}</button>
          {profileSaved && (
            <div role="status" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {translateText("Settings saved successfully!")}
            </div>
          )}
        </form>
      </div>

      {/* 3. Appearance & Language */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Theme */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{t('appearanceTheme')}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('currentTheme')}: {t(theme === 'dark' ? 'darkMode' : 'lightMode')}</div>
          </div>
          <button
            onClick={onToggleTheme}
            aria-label={t('themeSwitchLabel')}
            className="py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-600 dark:text-amber-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            <span>{t('toggleThemeBtn')}</span>
          </button>
        </div>

        {/* Language */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{t('appLanguage')}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Hindi / English / Hinglish</div>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs font-bold gap-1 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setLanguage('hi')}
              aria-pressed={lang === 'hi'}
              className={`px-2.5 py-1 rounded-lg transition ${
                lang === 'hi' ? 'bg-amber-500 text-slate-950' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              हिंदी
            </button>
            <button
              onClick={() => setLanguage('en')}
              aria-pressed={lang === 'en'}
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
          <span>{translateText("GopalAI Voice Preferences")}</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100">{translateText("Spoken Voice Confirmation (TTS)")}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{translateText("Speak AI responses back aloud")}</div>
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
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">{translateText("Voice Gender Persona")}</label>
              <select
                value={voiceGender}
                onChange={(e) => handleUpdateVoiceSettings({ voiceGender: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="female">{translateText("Female Voice (Natural Hindi/English)")}</option>
                <option value="male">{translateText("Male Voice (Deep Voice Persona)")}</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">{translateText("Speech Speed (")}{voiceSpeed}x)
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
          <span>{translateText("Notification & Background Permissions")}</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100">{lang === 'hi' ? 'ब्राउज़र नोटिफ़िकेशन' : 'Browser notifications'}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{lang === 'hi' ? 'ऐप खुला होने पर, ब्राउज़र की अनुमति के अनुसार।' : 'Immediate alerts only, while the app is open and browser permission allows.'}</div>
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
              <div className="font-bold text-slate-900 dark:text-slate-100">{translateText("Background Task Manager")}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{lang === 'hi' ? 'इस प्रीव्यू में उपलब्ध नहीं है।' : 'Not available in this preview.'}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled
                checked={false}
                aria-label={lang === 'hi' ? 'बैकग्राउंड कार्य उपलब्ध नहीं हैं' : 'Background tasks unavailable'}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 7. Clear Database (Strict Zero Reset) */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-rose-500/30 space-y-2 shadow-xs">
        <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-500" />
          <span>{t('resetDatabaseTitle')}</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">{translateText("Deletes all saved sales, expenses, inventory items, and suppliers across all 4 workspaces. Returns app to strict zero state.")}</p>
        <button
          onClick={handleClearAllData}
          className="py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/40 text-xs font-bold transition"
        >{translateText("Clear All Database Records")}</button>
      </div>
    </div>
  );
};
