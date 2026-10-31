import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation, Language } from '../services/i18n';

const IndiaFlag = () => (
  <svg className="w-8 h-6 rounded-md shadow-xs shrink-0 overflow-hidden border border-slate-700/50" viewBox="0 0 36 24">
    <rect width="36" height="8" fill="#FF9933" />
    <rect y="8" width="36" height="8" fill="#FFFFFF" />
    <rect y="16" width="36" height="8" fill="#138808" />
    <circle cx="18" cy="12" r="3" fill="none" stroke="#000080" strokeWidth="0.8" />
    <circle cx="18" cy="12" r="0.5" fill="#000080" />
  </svg>
);

const UKFlag = () => (
  <svg className="w-8 h-6 rounded-md shadow-xs shrink-0 overflow-hidden border border-slate-700/50" viewBox="0 0 60 40">
    <clipPath id="uk-flag-svg">
      <rect width="60" height="40" rx="2" />
    </clipPath>
    <g clipPath="url(#uk-flag-svg)">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="2" />
      <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="6" />
    </g>
  </svg>
);

export const LanguageSelector: React.FC = () => {
  const { lang, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedLang: Language) => {
    setLanguage(selectedLang);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Pill Button matching exact screenshot styling */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="language-trigger flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-950/90 text-slate-900 dark:text-white border-2 border-amber-500 dark:border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:shadow-[0_0_18px_rgba(245,158,11,0.6)] font-bold text-xs transition-all active:scale-95"
        title={t('selectLanguage')}
        aria-label={t('selectLanguage')}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-0.5 text-amber-700 dark:text-amber-400">
          <Globe className="w-4 h-4 stroke-[2.2]" />
          <span className="text-[10px] font-extrabold tracking-tighter">Aa</span>
        </div>
        <span className="w-px h-3.5 bg-amber-600/40 dark:bg-amber-400/50" />
        <span className="font-black tracking-wide text-xs text-amber-800 dark:text-amber-300">
          {lang === 'hi' ? 'HI' : 'EN'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-amber-700 dark:text-amber-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 flex flex-col items-center">
          {/* Top Triangle Pointer pointing up to button */}
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-amber-400 z-10 -mb-[1px]" />

          <div className="language-popover w-64 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-2 border-amber-400 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.35)] p-3.5 text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex items-center gap-2 pb-3 mb-2.5 border-b border-slate-200 dark:border-slate-800/80">
              <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                <Globe className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-amber-800 dark:text-amber-300 text-sm tracking-tight">
                {lang === 'hi' ? 'भाषा चुनें' : 'Select Language'}
              </span>
            </div>

            {/* Language Options */}
            <div className="space-y-2">
              {/* Hindi Option */}
              <button
                onClick={() => handleSelect('hi')}
                aria-pressed={lang === 'hi'}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all ${
                  lang === 'hi'
                    ? 'border-2 border-amber-400 bg-gradient-to-r from-amber-500/25 to-yellow-600/15 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-amber-50 dark:hover:bg-slate-800/80 hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IndiaFlag />
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">हिन्दी</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-none mt-0.5">Hindi</div>
                  </div>
                </div>

                {lang === 'hi' ? (
                  <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-400 dark:border-slate-600" />
                )}
              </button>

              {/* English Option */}
              <button
                onClick={() => handleSelect('en')}
                aria-pressed={lang === 'en'}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all ${
                  lang === 'en'
                    ? 'border-2 border-amber-400 bg-gradient-to-r from-amber-500/25 to-yellow-600/15 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-amber-50 dark:hover:bg-slate-800/80 hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UKFlag />
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">English</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-none mt-0.5">English</div>
                  </div>
                </div>

                {lang === 'en' ? (
                  <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-400 dark:border-slate-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
