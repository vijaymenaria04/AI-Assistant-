import React, { useEffect, useState } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  CreditCard,
  Boxes,
  Clock,
  CheckSquare,
  Filter,
  Check,
  Trash2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { db } from '../services/db';
import {
  NotificationItem,
  SyncQueueItem,
  InventoryItem,
  Supplier,
  Reminder,
  Task,
  BUSINESSES,
  BusinessId
} from '../types/database';
import { useTranslation } from '../services/i18n';

interface ExtendedAlert {
  id: string;
  title: string;
  message: string;
  type: 'low_stock' | 'payment_due' | 'reminder' | 'task' | 'sync' | 'system';
  businessId?: BusinessId;
  date: string;
  read: boolean;
  actionScreen?: string;
}

export const NotificationsView: React.FC = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    const n = await db.getNotifications();
    const q = await db.getSyncQueue();
    const i = await db.getInventory();
    const sup = await db.getSuppliers();
    const r = await db.getReminders();
    const tk = await db.getTasks();

    setNotifications(n);
    setSyncQueue(q);
    setInventory(i);
    setSuppliers(sup);
    setReminders(r);
    setTasks(tk);
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  // Compute ACTUAL real alerts dynamically from database tables
  const generatedAlerts: ExtendedAlert[] = [];

  // 1. Low Stock Alerts
  inventory.forEach((item) => {
    if (item.stockQuantity <= item.minStockLevel) {
      generatedAlerts.push({
        id: `alert_stock_${item.id}`,
        title: `Low Stock Alert: ${item.name}`,
        message: `Stock level is ${item.stockQuantity} ${item.unit} (Reorder threshold: ${item.minStockLevel} ${item.unit})`,
        type: 'low_stock',
        businessId: item.businessId,
        date: item.lastUpdated || new Date().toISOString(),
        read: readIds.has(`alert_stock_${item.id}`),
        actionScreen: 'inventory'
      });
    }
  });

  // 2. Pending Supplier Payment Dues
  suppliers.forEach((sup) => {
    const due = Math.max(0, sup.totalPurchases - sup.totalPaid);
    if (due > 0) {
      generatedAlerts.push({
        id: `alert_sup_${sup.id}`,
        title: `Pending Supplier Payment: ${sup.name}`,
        message: `Outstanding balance of ₹${due.toLocaleString('en-IN')} payable for ${BUSINESSES[sup.businessId]?.name || sup.businessId}`,
        type: 'payment_due',
        businessId: sup.businessId,
        date: sup.createdAt || new Date().toISOString(),
        read: readIds.has(`alert_sup_${sup.id}`),
        actionScreen: 'suppliers'
      });
    }
  });

  // 3. Active Upcoming Reminders
  reminders.forEach((rem) => {
    if (rem.status === 'active') {
      generatedAlerts.push({
        id: `alert_rem_${rem.id}`,
        title: `Reminder: ${rem.title}`,
        message: `Scheduled for ${new Date(rem.dateTime).toLocaleString()} (${BUSINESSES[rem.businessId || 'jain-sweets']?.name})`,
        type: 'reminder',
        businessId: rem.businessId,
        date: rem.createdAt || new Date().toISOString(),
        read: readIds.has(`alert_rem_${rem.id}`),
        actionScreen: 'tasks'
      });
    }
  });

  // 4. Incomplete Routine Tasks
  tasks.forEach((t) => {
    if (!t.completed) {
      generatedAlerts.push({
        id: `alert_task_${t.id}`,
        title: `Pending Task: ${t.title}`,
        message: `${t.description || 'Action required'} for ${BUSINESSES[t.businessId || 'jain-sweets']?.name}`,
        type: 'task',
        businessId: t.businessId,
        date: t.createdAt || new Date().toISOString(),
        read: readIds.has(`alert_task_${t.id}`),
        actionScreen: 'tasks'
      });
    }
  });

  // 5. Stored Notifications
  notifications.forEach((n) => {
    generatedAlerts.push({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type as any,
      date: n.date,
      read: n.read || readIds.has(n.id)
    });
  });

  // Filter alerts by Category & Read status
  const filteredAlerts = generatedAlerts.filter((alert) => {
    if (categoryFilter !== 'all' && alert.type !== categoryFilter) return false;
    if (readFilter === 'unread' && alert.read) return false;
    if (readFilter === 'read' && !alert.read) return false;
    return true;
  });

  const toggleReadStatus = (id: string) => {
    const next = new Set(readIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setReadIds(next);
  };

  const markAllAsRead = () => {
    const allIds = new Set(generatedAlerts.map((a) => a.id));
    setReadIds(allIds);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <Boxes className="w-4 h-4 text-rose-500" />;
      case 'payment_due':
        return <CreditCard className="w-4 h-4 text-amber-500" />;
      case 'reminder':
        return <Clock className="w-4 h-4 text-indigo-500" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <span>GopalAI Alerts & Notifications</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time System Alerts & Operational Reminders
          </p>
        </div>

        {generatedAlerts.length > 0 && (
          <button
            onClick={markAllAsRead}
            className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition border border-amber-500/30"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Sync Queue Status Banner */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">IndexedDB Local Storage Active</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Offline sync queue items pending: {syncQueue.length}
            </div>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase">
          Synced
        </span>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['all', 'low_stock', 'payment_due', 'reminder', 'task', 'sync'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat === 'all'
                ? `All Alerts (${generatedAlerts.length})`
                : cat === 'low_stock'
                ? 'Low Stock'
                : cat === 'payment_due'
                ? 'Supplier Dues'
                : cat === 'reminder'
                ? 'Reminders'
                : cat === 'task'
                ? 'Tasks'
                : 'Sync & System'}
            </button>
          ))}
        </div>

        {/* Read / Unread Status Filter */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-[11px] font-bold gap-1 border border-slate-200 dark:border-slate-800">
          {(['all', 'unread', 'read'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setReadFilter(r)}
              className={`px-2.5 py-1 rounded-lg capitalize transition ${
                readFilter === r
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto stroke-1" />
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">All Systems Operational</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              No active alerts or low stock warnings in your database.
            </div>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => toggleReadStatus(alert.id)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3 shadow-xs ${
                alert.read
                  ? 'bg-slate-50/60 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 opacity-60'
                  : 'bg-white/95 dark:bg-slate-900 border-amber-500/40 dark:border-amber-500/40 ring-1 ring-amber-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      {alert.title}
                    </span>
                    {!alert.read && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase">
                        New
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-1">
                    <span>{new Date(alert.date).toLocaleString()}</span>
                    {alert.businessId && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {BUSINESSES[alert.businessId]?.name || alert.businessId}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleReadStatus(alert.id);
                  }}
                  className={`p-1.5 rounded-lg border transition text-xs font-bold ${
                    alert.read
                      ? 'border-slate-300 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      : 'border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                  }`}
                  title="Toggle Read/Unread"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
