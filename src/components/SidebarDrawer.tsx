import React, { useEffect, useRef } from 'react';
import {
  X,
  LayoutDashboard,
  Mic,
  Wallet,
  CheckSquare,
  Candy,
  Utensils,
  Store,
  Layers,
  ShoppingBag,
  TrendingDown,
  Truck,
  Boxes,
  Users,
  CreditCard,
  UserCheck,
  ChefHat,
  FileText,
  Bell,
  Settings,
  ShieldCheck,
  ImagePlus
} from 'lucide-react';
import { BusinessId, BUSINESSES } from '../types/database';
import { useTranslation } from '../services/i18n';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeScreen: string;
  onNavigate: (screen: string) => void;
  currentBusinessId: BusinessId;
  onSelectBusiness: (id: BusinessId) => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeScreen,
  onNavigate,
  currentBusinessId,
  onSelectBusiness
}) => {
  const { t, lang } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  const navItems = [
    { id: 'home', label: t('homeDashboard'), icon: LayoutDashboard },
    { id: 'ai-assistant', label: t('aiAssistantVoice'), icon: Mic, badge: t('voiceAI') },
    { id: 'poster-studio', label: lang === 'hi' ? 'AI पोस्टर और बैनर स्टूडियो' : 'AI Poster & Banner Studio', icon: ImagePlus },
    { id: 'personal', label: t('personalFinance'), icon: Wallet },
    { id: 'tasks', label: t('tasksReminders'), icon: CheckSquare },
    { id: 'combined', label: t('combinedBusinessReport'), icon: Layers },
    { id: 'jain-sweets', label: t('jainSweets'), icon: Candy },
    { id: 'paan-bai', label: t('paanBai'), icon: Utensils },
    { id: 'kesarwadi', label: t('kesarwadi'), icon: Store },
    { id: 'sales', label: t('salesManagement'), icon: ShoppingBag },
    { id: 'expenses', label: t('expensesManagement'), icon: TrendingDown },
    { id: 'purchases', label: t('purchasesStockIn'), icon: Truck },
    { id: 'inventory', label: t('inventoryManagement'), icon: Boxes },
    { id: 'suppliers', label: t('suppliersLedger'), icon: Users },
    { id: 'payments', label: t('paymentsLedger'), icon: CreditCard },
    { id: 'staff', label: t('staffPayroll'), icon: UserCheck },
    { id: 'catering', label: t('cateringOrders'), icon: ChefHat, badge: t('catering') },
    { id: 'reports', label: t('reportsAnalytics'), icon: FileText },
    { id: 'notifications', label: t('notificationJobs'), icon: Bell },
    { id: 'settings', label: t('settingsSecurity'), icon: Settings }
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Classic drawer layout, with the same colours as the dashboard. */}
      <aside role="dialog" aria-modal="true" aria-label={lang === 'hi' ? 'मुख्य मेनू' : 'Main menu'} className="classic-sidebar relative w-72 max-w-[88vw] text-slate-900 dark:text-slate-100 flex flex-col h-full z-10 overflow-hidden">
        <div className="classic-sidebar-header flex items-center justify-between gap-2 p-4 border-b border-slate-200 dark:border-amber-500/20">
          <div className="flex items-center gap-3 min-w-0">
            <img className="w-10 h-10 rounded-xl border border-amber-500/30 shrink-0" src="/gopalai-logo.png" alt="GopalAI logo" width="512" height="512" />
            <div className="min-w-0">
              <div className="font-extrabold text-amber-700 dark:text-amber-400 text-sm leading-tight">GopalAI Assistant</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{lang === 'hi' ? 'आपका बिज़नेस साथी' : 'Your business companion'}</div>
            </div>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label={lang === 'hi' ? 'मेनू बंद करें' : 'Close menu'} className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="classic-sidebar-workspaces p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5 px-1">{t('activeBusinessAccount')}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.values(BUSINESSES).map((bus) => (
              <button key={bus.id} onClick={() => { onSelectBusiness(bus.id); onClose(); }} aria-pressed={currentBusinessId === bus.id}
                className={`min-w-0 px-2 py-2 rounded-xl text-left text-[11px] font-semibold flex items-center gap-1.5 transition ${currentBusinessId === bus.id ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40' : 'bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent'}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bus.color }} />
                <span className="min-w-0 whitespace-normal break-words leading-tight">{t(({ 'jain-sweets': 'jainSweets', 'paan-bai': 'paanBai', 'kesarwadi': 'kesarwadi', 'gopal-caterers': 'gopalCaterers', personal: 'personal' } as const)[bus.id])}</span>
              </button>
            ))}
          </div>
        </div>

        <nav className="classic-sidebar-nav flex-1 min-h-0 overflow-y-auto py-2 px-2 space-y-1" aria-label={lang === 'hi' ? 'नेविगेशन' : 'Navigation'}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button key={item.id} onClick={() => { onNavigate(item.id); onClose(); }} aria-current={isActive ? 'page' : undefined} className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 text-left text-xs font-semibold transition ${isActive ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/40' : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/80 border border-transparent'}`}>
                <span className="flex items-center gap-3 min-w-0"><Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`} /><span>{item.label}</span></span>
                {item.badge && <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        <div className="classic-sidebar-footer p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium"><ShieldCheck className="w-3.5 h-3.5" />{t('localOfflineReady')}</span>
        </div>
      </aside>
    </div>
  );
};
