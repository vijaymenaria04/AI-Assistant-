import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  TrendingDown,
  Boxes,
  CreditCard,
  Mic,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  PlusCircle,
  CheckSquare,
  Clock,
  Send,
  Building2,
  Candy,
  Utensils,
  Store,
  UserCheck,
  RefreshCw,
  Plus,
  ChefHat
} from 'lucide-react';
import { db } from '../services/db';
import { aiAgent } from '../services/aiAgent';
import { BusinessId, BUSINESSES, Sale, Expense, InventoryItem, Supplier, Task, Reminder } from '../types/database';
import { useTranslation } from '../services/i18n';

interface HomeDashboardViewProps {
  currentBusinessId: BusinessId;
  onNavigate: (screen: string) => void;
  onOpenVoiceOrb: () => void;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  currentBusinessId,
  onNavigate,
  onOpenVoiceOrb
}) => {
  const { t } = useTranslation();
  const [selectedWorkspace, setSelectedWorkspace] = useState<BusinessId>(currentBusinessId);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Inline text command input state
  const [commandInput, setCommandInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandStatus, setCommandStatus] = useState<string | null>(null);

  const loadDashboardData = async () => {
    const s = await db.getSales(selectedWorkspace);
    const e = await db.getExpenses(selectedWorkspace);
    const i = await db.getInventory(selectedWorkspace);
    const sup = await db.getSuppliers(selectedWorkspace);
    const tList = await db.getTasks();
    const rList = await db.getReminders();

    setSales(s);
    setExpenses(e);
    setInventory(i);
    setSuppliers(sup);
    setTasks(tList);
    setReminders(rList);
  };

  useEffect(() => {
    setSelectedWorkspace(currentBusinessId);
  }, [currentBusinessId]);

  useEffect(() => {
    loadDashboardData();
    const unsubscribe = db.subscribe(loadDashboardData);
    return unsubscribe;
  }, [selectedWorkspace]);

  // Operational metrics calculated strictly from database
  const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalStockCount = inventory.length;
  const lowStockCount = inventory.filter((item) => item.stockQuantity <= item.minStockLevel).length;
  const totalPendingPayables = suppliers.reduce((sum, sup) => sum + sup.totalPayable, 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter((t) => !t.completed);
  const todayReminders = reminders.filter((r) => r.status === 'active');

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || isProcessing) return;

    const text = commandInput.trim();
    setCommandInput('');
    setIsProcessing(true);
    setCommandStatus(null);

    try {
      const { result } = await aiAgent.processCommand(text, selectedWorkspace);
      if (result.requires_owner_confirmation) {
        setCommandStatus(result.speech_response || 'Owner confirmation required.');
        onOpenVoiceOrb();
      } else {
        const msg = await aiAgent.executeAction(result);
        setCommandStatus(msg);
      }
    } catch (err) {
      setCommandStatus('Command failed to process. Try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getWorkspaceIcon = (id: BusinessId) => {
    switch (id) {
      case 'jain-sweets': return <Candy className="w-4 h-4 text-amber-500" />;
      case 'paan-bai': return <Utensils className="w-4 h-4 text-emerald-500" />;
      case 'kesarwadi': return <Store className="w-4 h-4 text-orange-500" />;
      case 'gopal-caterers': return <ChefHat className="w-4 h-4 text-purple-500" />;
      default: return <UserCheck className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto pb-24">
      {/* 1. Workspace Selector Strip */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
          Select Workspace
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {Object.values(BUSINESSES).map((bus) => (
            <button
              key={bus.id}
              onClick={() => setSelectedWorkspace(bus.id)}
              className={`px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                selectedWorkspace === bus.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
                  : 'bg-white/90 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-amber-500/10'
              }`}
            >
              {getWorkspaceIcon(bus.id)}
              <span>{bus.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Central GopalAI Voice Assistant & Text Command Input */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-yellow-500/15 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/60 border border-amber-500/30 dark:border-amber-500/30 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
              <span>GopalAI Central Assistant</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              AI Agent ({BUSINESSES[selectedWorkspace]?.name})
            </h1>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Speak or type commands in Hindi or English (e.g., "Add sale 5000 in cash", "Kharcha 800 rupees").
            </p>
          </div>

          <button
            onClick={onOpenVoiceOrb}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 shrink-0"
          >
            <Mic className="w-5 h-5 stroke-[2.5] animate-pulse" />
            <span>Launch Voice Assistant</span>
          </button>
        </div>

        {/* Text Command Input Directly on Home */}
        <form onSubmit={handleCommandSubmit} className="flex gap-2">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Type command e.g., 'Jain Sweets me 12000 sale add karo'..."
            className="flex-1 bg-white/95 dark:bg-slate-950 border border-amber-500/40 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={!commandInput.trim() || isProcessing}
            className="py-2.5 px-4 rounded-2xl bg-slate-900 dark:bg-amber-500 text-amber-400 dark:text-slate-950 font-bold text-xs hover:brightness-110 disabled:opacity-50 transition flex items-center justify-center gap-1.5 shadow-md"
          >
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>

        {commandStatus && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300">
            {commandStatus}
          </div>
        )}
      </div>

      {/* 3. Operational Metrics Grid (Directly from Database) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Actual Sales */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-amber-500/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('totalSales')}</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
            ₹{totalSales.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            {sales.length} transactions
          </div>
        </div>

        {/* Actual Expenses */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('totalExpenses')}</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            {expenses.length} entries
          </div>
        </div>

        {/* Stock Items */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Stock Items</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {totalStockCount} <span className="text-xs font-normal text-slate-500">items</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            {lowStockCount > 0 ? `${lowStockCount} low stock` : 'Stock updated'}
          </div>
        </div>

        {/* Pending Payments */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Pending Payables</span>
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-orange-600 dark:text-orange-400">
            ₹{totalPendingPayables.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Supplier dues
          </div>
        </div>
      </div>

      {/* 4. Quick Actions */}
      <div>
        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2.5">
          {t('quickActions')}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => onNavigate('sales')}
            className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900 hover:bg-amber-500/5 border border-slate-200/90 dark:border-amber-500/30 text-left transition flex items-center gap-3 group shadow-xs"
          >
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{t('addSale')}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('recordBill')}</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('expenses')}
            className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900 hover:bg-rose-500/5 border border-slate-200/90 dark:border-slate-800 text-left transition flex items-center gap-3 group shadow-xs"
          >
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{t('addExpense')}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('recordCosts')}</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('inventory')}
            className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900 hover:bg-emerald-500/5 border border-slate-200/90 dark:border-slate-800 text-left transition flex items-center gap-3 group shadow-xs"
          >
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Add Stock</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Inventory Entry</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('tasks')}
            className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900 hover:bg-indigo-500/5 border border-slate-200/90 dark:border-slate-800 text-left transition flex items-center gap-3 group shadow-xs"
          >
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Add Reminder</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Tasks & Alerts</div>
            </div>
          </button>
        </div>
      </div>

      {/* 5. Today's Tasks & Recent Transactions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Tasks & Reminders */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-amber-500" />
              <span>Today's Scheduled Tasks</span>
            </div>
            <button onClick={() => onNavigate('tasks')} className="text-amber-600 dark:text-amber-400 hover:underline">
              {t('viewAll')}
            </button>
          </div>

          {todayTasks.length === 0 && todayReminders.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              No tasks or reminders scheduled for today.
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-800 dark:text-slate-200">
                  <span className="font-semibold">{task.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">Task</span>
                </div>
              ))}
              {todayReminders.slice(0, 2).map((rem) => (
                <div key={rem.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-800 dark:text-slate-200">
                  <span className="font-semibold">{rem.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-bold">Reminder</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
            <span>Recent Transactions ({BUSINESSES[selectedWorkspace]?.name})</span>
            <button onClick={() => onNavigate('sales')} className="text-amber-600 dark:text-amber-400 hover:underline">
              {t('viewAll')}
            </button>
          </div>

          {sales.length === 0 && expenses.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              {t('noTransactionsYet')}
            </div>
          ) : (
            <div className="space-y-2">
              {sales.slice(0, 2).map((s) => (
                <div key={s.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-200">Sale ({s.paymentMethod.toUpperCase()})</span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">+₹{s.amount}</span>
                </div>
              ))}
              {expenses.slice(0, 2).map((e) => (
                <div key={e.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-200">Expense ({e.category.replace('_', ' ')})</span>
                  </div>
                  <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">-₹{e.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
