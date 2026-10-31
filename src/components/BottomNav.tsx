import { translateText } from '../services/i18n';
import React from 'react';
import { Home, Mic, ShoppingBag, FileText, CheckSquare, Boxes } from 'lucide-react';
import { useTranslation } from '../services/i18n';

interface BottomNavProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  onOpenVoiceOrb: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, onNavigate, onOpenVoiceOrb }) => {
  const { t, lang } = useTranslation();
  // Short labels fit narrow phones without changing translations elsewhere in the app.
  const tabs = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'sales', label: lang === 'hi' ? 'बिक्री' : t('sales'), icon: ShoppingBag },
    { id: 'inventory', label: lang === 'hi' ? 'स्टॉक' : t('stock'), icon: Boxes },
    { id: 'ai-orb-center', label: t('aiVoice'), icon: Mic, isCenter: true },
    { id: 'tasks', label: lang === 'hi' ? 'कार्य' : t('tasks'), icon: CheckSquare },
    { id: 'reports', label: t('reports'), icon: FileText }
  ];

  return (
    <nav aria-label={lang === 'hi' ? 'मुख्य नेविगेशन' : 'Main navigation'} className="bottom-bar">
      <div className="bottom-bar-grid">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeScreen === tab.id;
          return tab.isCenter ? (
            <div key={tab.id} className="bottom-bar-voice-wrap">
              <button onClick={onOpenVoiceOrb} className="bottom-bar-voice" title={translateText('Speak to GopalAI')} aria-label={translateText('Speak to GopalAI')}>
                <Mic className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <button key={tab.id} onClick={() => onNavigate(tab.id)} aria-current={isActive ? 'page' : undefined} className={`bottom-bar-tab ${isActive ? 'is-active' : ''}`}>
              <Icon className="bottom-bar-icon" />
              <span className="bottom-bar-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
