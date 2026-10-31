import React from 'react';
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
  Download
} from 'lucide-react';
import { BusinessId, BUSINESSES } from '../types/database';

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
  if (!isOpen) return null;

  const navItems = [
    { id: 'home', label: 'Home Dashboard', icon: LayoutDashboard },
    { id: 'ai-assistant', label: 'AI Assistant (Voice)', icon: Mic, badge: 'Voice AI' },
    { id: 'personal', label: 'Personal Finance', icon: Wallet },
    { id: 'tasks', label: 'Tasks & Reminders', icon: CheckSquare },
    { id: 'combined', label: 'Combined Business Report', icon: Layers },
    { id: 'jain-sweets', label: 'Jain Sweets', icon: Candy },
    { id: 'paan-bai', label: 'Paan Bai Canteen', icon: Utensils },
    { id: 'kesarwadi', label: 'Kesarwadi Canteen', icon: Store },
    { id: 'sales', label: 'Sales Management', icon: ShoppingBag },
    { id: 'expenses', label: 'Expenses Management', icon: TrendingDown },
    { id: 'purchases', label: 'Purchases & Stock In', icon: Truck },
    { id: 'inventory', label: 'Inventory Management', icon: Boxes },
    { id: 'suppliers', label: 'Suppliers & Ledger', icon: Users },
    { id: 'payments', label: 'Payments (Payables/Receivables)', icon: CreditCard },
    { id: 'staff', label: 'Staff & Payroll', icon: UserCheck },
    { id: 'catering', label: 'Gopal Caterers Orders', icon: ChefHat, badge: 'Catering' },
    { id: 'reports', label: 'Reports & Analytics', icon: FileText },
    { id: 'notifications', label: 'Notifications & Alert Jobs', icon: Bell },
    { id: 'apk-guide', label: 'Android App & Backup', icon: Download },
    { id: 'settings', label: 'Settings & Security', icon: Settings }
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-72 max-w-[80vw] bg-white/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-amber-500/30 text-slate-900 dark:text-slate-100 flex flex-col h-full shadow-2xl z-10 overflow-hidden backdrop-blur-2xl transition-colors">
        {/* Drawer Header */}
        <div className="p-4 bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
              G
            </div>
            <div>
              <div className="font-extrabold text-amber-600 dark:text-amber-400 text-sm tracking-wide">
                GopalAI Assistant
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Owner Access • Android System</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Business Switcher Strip */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 px-1">
            Active Business Account
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.values(BUSINESSES).map((bus) => (
              <button
                key={bus.id}
                onClick={() => {
                  onSelectBusiness(bus.id);
                  if (['jain-sweets', 'paan-bai', 'kesarwadi', 'personal'].includes(bus.id)) {
                    onNavigate(bus.id);
                  }
                  onClose();
                }}
                className={`px-2 py-1.5 rounded-xl text-left text-xs font-semibold flex items-center gap-1.5 transition ${
                  currentBusinessId === bus.id
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bus.color }} />
                <span className="truncate">{bus.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Nav List */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Local & Offline Ready</span>
          </span>
          <span>v2.5 Android</span>
        </div>
      </div>
    </div>
  );
};
