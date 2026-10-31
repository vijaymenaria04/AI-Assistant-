import React from 'react';
import { Home, Mic, ShoppingBag, FileText, CheckSquare, Boxes } from 'lucide-react';
import { useTranslation } from '../services/i18n';

interface BottomNavProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  onOpenVoiceOrb: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeScreen,
  onNavigate,
  onOpenVoiceOrb
}) => {
  const { t } = useTranslation();

  const tabs = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'sales', label: t('sales'), icon: ShoppingBag },
    { id: 'inventory', label: t('stock'), icon: Boxes },
    { id: 'ai-orb-center', label: t('aiVoice'), icon: Mic, isCenter: true },
    { id: 'tasks', label: t('tasks'), icon: CheckSquare },
    { id: 'reports', label: t('reports'), icon: FileText }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-slate-950/80 backdrop-blur-2xl border-t border-slate-200/90 dark:border-amber-500/20 px-2 py-1.5 flex items-center justify-around text-slate-500 dark:text-slate-400 max-w-lg mx-auto sm:max-w-none transition-colors shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeScreen === tab.id;

        if (tab.isCenter) {
          return (
            <div key={tab.id} className="relative -top-3">
              <button
                onClick={onOpenVoiceOrb}
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-white dark:border-slate-950 active:scale-95 transition"
                title="Speak to GopalAI"
              >
                <Mic className="w-5 h-5 stroke-[2.5] animate-pulse" />
              </button>
            </div>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
              isActive
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600 dark:text-amber-400 stroke-[2.3]' : ''}`} />
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
