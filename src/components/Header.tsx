import { translateText } from '../services/i18n';
import React, { useState } from 'react';
import {
  Menu,
  ArrowLeft,
  Mic,
  Sun,
  Moon,
  Candy,
  Utensils,
  Store,
  UserCheck,
  ChefHat,
  ChevronDown,
  Globe
} from 'lucide-react';
import { BusinessId, BUSINESSES } from '../types/database';
import { useTranslation } from '../services/i18n';
import { LanguageSelector } from './LanguageSelector';

interface HeaderProps {
  currentBusinessId: BusinessId;
  onSelectBusiness: (id: BusinessId) => void;
  onOpenDrawer: () => void;
  onOpenVoiceOrb: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isOnline: boolean;
  onBack: () => void;
  canGoBack: boolean;
  showBackButton: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentBusinessId,
  onSelectBusiness,
  onOpenDrawer,
  onOpenVoiceOrb,
  theme,
  onToggleTheme,
  isOnline,
  onBack,
  canGoBack,
  showBackButton
}) => {
  const { t, lang, toggleLanguage } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentBusiness = BUSINESSES[currentBusinessId];

  const getBusinessIcon = (iconName: string) => {
    switch (iconName) {
      case 'Candy': return <Candy className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case 'Utensils': return <Utensils className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
      case 'Store': return <Store className="w-4 h-4 text-orange-500 dark:text-orange-400" />;
      case 'ChefHat': return <ChefHat className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
      default: return <UserCheck className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
    }
  };

  return (
    <header className="restored-header sticky top-0 z-30 bg-white/90 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-slate-200/90 dark:border-amber-500/20 text-slate-900 dark:text-slate-100 shadow-xs transition-colors">
      <div className="px-2 sm:px-3 py-2.5 flex items-center justify-between gap-1 sm:gap-2 max-w-5xl mx-auto">
        {/* Navigation Menu Toggle */}
        <button
          onClick={onOpenDrawer}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 border border-slate-200/90 dark:border-amber-500/20 transition active:scale-95 shadow-xs"
          title={translateText("Open Menu Drawer")}
        >
          <Menu className="w-5 h-5 stroke-[2.2]" />
        </button>

        {showBackButton && <button onClick={onBack} disabled={!canGoBack} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 border border-slate-200/90 dark:border-amber-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed" title={lang === 'hi' ? 'वापस जाएँ' : 'Go back'} aria-label={lang === 'hi' ? 'वापस जाएँ' : 'Go back'}>
          <ArrowLeft className="w-4 h-4" />
        </button>}

        {/* Business Selector Dropdown */}
        <div className="relative flex-1 min-w-0 max-w-xs">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label={lang === 'hi' ? 'कार्यक्षेत्र चुनें' : 'Choose workspace'}
            aria-expanded={dropdownOpen}
            className="w-full min-h-9 py-1.5 px-2 sm:px-3 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-300/80 dark:border-amber-500/30 flex items-center justify-between text-left shadow-xs transition hover:border-amber-500/60"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden min-[380px]:inline-flex">{getBusinessIcon(currentBusiness.icon)}</span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-amber-300 truncate leading-tight">
                  {translateText(currentBusiness.name)}
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500 dark:text-amber-400 shrink-0 ml-1" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 w-64 max-w-[calc(100vw-4rem)] mt-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-amber-500/30 rounded-2xl shadow-2xl py-1 z-50 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {Object.values(BUSINESSES).map((bus) => (
                <button
                  key={bus.id}
                  onClick={() => {
                    onSelectBusiness(bus.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-amber-500/10 transition ${
                    currentBusinessId === bus.id
                      ? 'bg-amber-500/15 border-l-3 border-amber-500'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {getBusinessIcon(bus.icon)}
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {translateText(bus.name)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Premium Language Switcher Dropdown */}
          <LanguageSelector />

          {/* Light/Dark Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition shadow-xs"
            title={t('themeSwitchLabel')}
            aria-label={t('themeSwitchLabel')}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* AI Voice Orb Launcher */}
          <button
            onClick={onOpenVoiceOrb}
            className="hidden sm:flex p-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/25 transition active:scale-95"
            title={translateText("Launch Voice AI Assistant")}
          >
            <Mic className="w-5 h-5 stroke-[2.5]" />
          </button>

        </div>
      </div>
    </header>
  );
};
