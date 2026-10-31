import { isLowStock } from '../services/inventory';
import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Boxes, CalendarDays, CheckCircle2, ChefHat, ClipboardList, CreditCard, Mic, ShoppingBag, Sparkles, TrendingDown, Wallet } from 'lucide-react';
import { db } from '../services/db';
import { useTranslation, translateText } from '../services/i18n';
import { BusinessId, BUSINESSES, Sale, Expense, InventoryItem, Supplier, PersonalTransaction, CateringOrder, Task } from '../types/database';

interface Props {
  currentBusinessId: BusinessId;
  onSelectBusiness: (id: BusinessId) => void;
  onNavigate: (screen: string) => void;
  onOpenVoiceOrb: () => void;
}

type DashboardData = {
  id: BusinessId;
  sales: Sale[];
  expenses: Expense[];
  stock: InventoryItem[];
  suppliers: Supplier[];
  personal: PersonalTransaction[];
  orders: CateringOrder[];
  tasks: Task[];
};

const money = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const workspaceOrder: BusinessId[] = ['personal', 'jain-sweets', 'kesarwadi', 'paan-bai', 'gopal-caterers'];

export const WorkspaceDashboard: React.FC<Props> = ({ currentBusinessId, onSelectBusiness, onNavigate, onOpenVoiceOrb }) => {
  const { t, lang } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);
  const hi = lang === 'hi';
  const text = (en: string, hindi: string) => hi ? hindi : en;
  const business = BUSINESSES[currentBusinessId];

  useEffect(() => {
    let active = true;
    let sequence = 0;
    setData(null);
    setError(false);
    const load = async () => {
      const request = ++sequence;
      try {
        const [sales, expenses, stock, suppliers, personal, orders, tasks] = await Promise.all([
          currentBusinessId === 'personal' ? Promise.resolve([]) : db.getSales(currentBusinessId), db.getExpenses(currentBusinessId), db.getInventory(currentBusinessId),
          db.getSuppliers(currentBusinessId), currentBusinessId === 'personal' ? db.getPersonalTransactions() : Promise.resolve([]),
          currentBusinessId === 'gopal-caterers' ? db.getCateringOrders() : Promise.resolve([]), db.getTasks()
        ]);
        if (active && request === sequence) {
          setData({ id: currentBusinessId, sales, expenses, stock, suppliers, personal, orders, tasks });
          setError(false);
        }
      } catch (err) {
        console.error('Unable to load workspace dashboard:', err);
        if (active && request === sequence) setError(true);
      }
    };
    void load();
    const unsubscribe = db.subscribe(load);
    return () => { active = false; unsubscribe(); };
  }, [currentBusinessId]);

  // Never show the previous workspace's data while the next one loads.
  const current = data?.id === currentBusinessId ? data : null;
  const isPersonal = currentBusinessId === 'personal';
  const isCatering = currentBusinessId === 'gopal-caterers';
  const sales = current?.sales ?? [];
  const expenses = current?.expenses ?? [];
  const personal = current?.personal ?? [];
  const orders = current?.orders ?? [];
  const income = isPersonal ? personal.filter(x => x.type === 'income').reduce((n, x) => n + x.amount, 0) : sales.reduce((n, x) => n + x.amount, 0);
  const spend = isPersonal ? personal.filter(x => x.type === 'expense').reduce((n, x) => n + x.amount, 0) : expenses.reduce((n, x) => n + x.amount, 0);
  const lowStock = (current?.stock ?? []).filter(x => isLowStock(x)).length;
  const pending = (current?.suppliers ?? []).reduce((n, x) => n + x.totalPayable, 0);
  const openOrders = orders.filter(x => !['completed', 'cancelled'].includes(x.status));
  const openTasks = (current?.tasks ?? []).filter(x => !x.completed && x.businessId === currentBusinessId);

  const metrics = isPersonal ? [
    { label: text('Total income', 'कुल आय'), value: money(income), hint: text('All personal income', 'सभी व्यक्तिगत आय'), icon: ArrowDownLeft, tone: 'emerald' },
    { label: text('Total expenses', 'कुल खर्च'), value: money(spend), hint: text('All personal expenses', 'सभी व्यक्तिगत खर्च'), icon: ArrowUpRight, tone: 'rose' },
    { label: text('Net balance', 'शुद्ध शेष'), value: money(income - spend), hint: text('Income minus expenses', 'आय घटा खर्च'), icon: Wallet, tone: 'blue' },
    { label: text('Open tasks', 'बाकी कार्य'), value: String(openTasks.length), hint: text('Personal tasks', 'व्यक्तिगत कार्य'), icon: CheckCircle2, tone: 'amber' }
  ] : isCatering ? [
    { label: text('Active orders', 'सक्रिय ऑर्डर'), value: String(openOrders.length), hint: text('Excludes completed & cancelled', 'पूरे और रद्द ऑर्डर छोड़कर'), icon: ClipboardList, tone: 'purple' },
    { label: text('Order value', 'ऑर्डर मूल्य'), value: money(orders.filter(x => x.status !== 'cancelled').reduce((n, x) => n + x.totalAmount, 0)), hint: text('Non-cancelled orders', 'रद्द ऑर्डर छोड़कर'), icon: ChefHat, tone: 'amber' },
    { label: text('Pending on orders', 'ऑर्डर की बकाया राशि'), value: money(orders.filter(x => x.status !== 'cancelled').reduce((n, x) => n + x.pendingAmount, 0)), hint: text('Non-cancelled orders', 'रद्द ऑर्डर छोड़कर'), icon: CreditCard, tone: 'rose' },
    { label: text('Recorded expenses', 'दर्ज खर्च'), value: money(spend), hint: text('All-time expenses', 'अब तक के खर्च'), icon: TrendingDown, tone: 'blue' }
  ] : [
    { label: t('totalSales'), value: money(income), hint: text(`${sales.length} transactions`, `${sales.length} लेनदेन`), icon: ShoppingBag, tone: 'amber' },
    { label: t('totalExpenses'), value: money(spend), hint: text(`${expenses.length} entries`, `${expenses.length} प्रविष्टियां`), icon: TrendingDown, tone: 'rose' },
    { label: text('Stock items', 'स्टॉक आइटम'), value: String(current?.stock.length ?? 0), hint: text(`${lowStock} low stock`, `${lowStock} कम स्टॉक`), icon: Boxes, tone: 'emerald' },
    { label: t('pendingPayables'), value: money(pending), hint: text('Supplier dues', 'सप्लायर बकाया'), icon: CreditCard, tone: 'blue' }
  ];

  const activities = isPersonal
    ? personal.map(x => ({ id: x.id, label: x.category, date: x.date, amount: x.amount, positive: x.type === 'income' }))
    : [ ...sales.map(x => ({ id: `s-${x.id}`, label: text('Sale', 'बिक्री'), date: x.date, amount: x.amount, positive: true })),
        ...expenses.map(x => ({ id: `e-${x.id}`, label: text('Expense', 'खर्च'), date: x.date, amount: x.amount, positive: false })) ];
  activities.sort((a, b) => b.date.localeCompare(a.date));
  const actions = isPersonal ? [
    { label: text('Personal', 'व्यक्तिगत'), detail: text('Tasks, notes & finances', 'कार्य, नोट्स और वित्त'), screen: 'personal', icon: Wallet },
    { label: text('Tasks & reminders', 'कार्य और रिमाइंडर'), detail: text('Plan your day', 'अपना दिन व्यवस्थित करें'), screen: 'tasks', icon: CheckCircle2 },
    { label: t('viewReports'), detail: text('Explore insights', 'जानकारी देखें'), screen: 'reports', icon: BarChart3 }
  ] : isCatering ? [
    { label: text('Catering orders', 'कैटरिंग ऑर्डर'), detail: text('Bookings & events', 'बुकिंग और कार्यक्रम'), screen: 'catering', icon: ChefHat },
    { label: t('staffPayroll'), detail: text('Team & allocation', 'टीम और आवंटन'), screen: 'staff', icon: ClipboardList },
    { label: t('viewReports'), detail: text('Explore insights', 'जानकारी देखें'), screen: 'reports', icon: BarChart3 }
  ] : [
    { label: t('addSale'), detail: t('recordBill'), screen: 'sales', icon: ShoppingBag },
    { label: t('addExpense'), detail: t('recordCosts'), screen: 'expenses', icon: TrendingDown },
    { label: t('viewStock'), detail: text('Manage inventory', 'इन्वेंट्री प्रबंधित करें'), screen: 'inventory', icon: Boxes },
    { label: t('viewReports'), detail: text('Explore insights', 'जानकारी देखें'), screen: 'reports', icon: BarChart3 }
  ];

  return (
    <div className="workspace-dashboard mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 sm:pt-9">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="dashboard-eyebrow">{text('YOUR WORKSPACES', 'आपके कार्यक्षेत्र')}</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{text('Your day, in focus.', 'आपका दिन, एक नज़र में।')}</h1></div>
        <span className="dashboard-date"><CalendarDays size={15} />{new Intl.DateTimeFormat(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span>
      </div>

      <nav aria-label={text('Choose workspace', 'कार्यक्षेत्र चुनें')} className="workspace-tabs mb-6">
        {workspaceOrder.map(id => <button type="button" key={id} onClick={() => onSelectBusiness(id)} aria-pressed={currentBusinessId === id} className={`workspace-tab ${currentBusinessId === id ? 'is-selected' : ''}`}>
          <span className="workspace-dot" style={{ backgroundColor: BUSINESSES[id].color }} />{translateText(BUSINESSES[id].name)}
        </button>)}
      </nav>

      <section className="workspace-hero" style={{ '--workspace-color': business.color } as React.CSSProperties}>
        <div className="workspace-hero-content">
          <div className="hero-badge"><span className="workspace-dot" style={{ backgroundColor: business.color }} />{text('WORKSPACE OVERVIEW', 'कार्यक्षेत्र अवलोकन')}</div>
          <h2>{translateText(business.name)}</h2>
          <p>{translateText(business.type)} · {text('Everything important, together in one place.', 'सभी ज़रूरी जानकारी, एक ही जगह।')}</p>
          <div className="hero-actions"><button onClick={() => onNavigate(isPersonal ? 'personal' : isCatering ? 'catering' : 'sales')} className="hero-primary">{text('Open workspace', 'कार्यक्षेत्र खोलें')} <ArrowRight size={16} /></button><button onClick={onOpenVoiceOrb} className="hero-secondary"><Mic size={16} /> {text('Ask GopalAI', 'GopalAI से पूछें')}</button></div>
        </div>
        <div aria-hidden="true" className="hero-orbit"><div className="hero-orbit-inner"><Sparkles size={34} /></div></div>
      </section>

      {error && <p role="alert" className="my-4 text-sm text-rose-600 dark:text-rose-400">{text('Unable to load dashboard data. Please try again.', 'डैशबोर्ड डेटा लोड नहीं हुआ। कृपया पुनः प्रयास करें।')}</p>}
      <div className="section-heading"><div><p className="dashboard-eyebrow">{text('THE BIG PICTURE', 'एक नज़र में')}</p><h2>{text('Workspace snapshot', 'कार्यक्षेत्र की झलक')}</h2></div><span>{text('All time', 'अब तक')}</span></div>
      <div className="metric-grid" aria-busy={!current && !error}>
        {metrics.map(({ label, value, hint, icon: Icon, tone }) => <div key={label} className="glass-panel metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon tone-${tone}`}><Icon size={17} /></span></div><div className="metric-value">{current ? value : '—'}</div><div className="metric-hint">{hint}</div></div>)}
      </div>

      <div className="section-heading"><div><h2>{t('quickActions')}</h2></div></div>
      <div className="action-grid">{actions.map(({ label, detail, screen, icon: Icon }) => <button key={screen} onClick={() => onNavigate(screen)} className="glass-panel action-card"><span className="action-icon"><Icon size={19} /></span><span className="action-copy"><strong>{label}</strong><small>{detail}</small></span><ArrowRight className="action-arrow" size={16} /></button>)}</div>

      <div className="dashboard-columns">
        <section className="glass-panel dashboard-list"><div className="list-heading"><div><p className="dashboard-eyebrow">{isCatering ? text('YOUR BOOKINGS', 'आपकी बुकिंग') : text('YOUR ACTIVITY', 'आपकी गतिविधि')}</p><h2>{isCatering ? text('Active orders', 'सक्रिय ऑर्डर') : text('Recent activity', 'हाल की गतिविधि')}</h2></div><button onClick={() => onNavigate(isCatering ? 'catering' : isPersonal ? 'personal' : 'sales')}>{t('viewAll')} <ArrowRight size={14} /></button></div>
          {!current ? <p className="empty-state">{error ? text('Data unavailable', 'डेटा उपलब्ध नहीं है') : text('Loading...', 'लोड हो रहा है...')}</p> : isCatering ? (openOrders.length ? [...openOrders].sort((a, b) => a.eventDate.localeCompare(b.eventDate)).slice(0, 4).map(order => <div className="activity-row" key={order.id}><span className="activity-icon tone-purple"><ChefHat size={16} /></span><span className="activity-copy"><strong>{order.customerName}</strong><small>{order.eventDate} · {order.venue}</small></span><strong>{money(order.totalAmount)}</strong></div>) : <p className="empty-state">{text('No active orders yet.', 'अभी कोई सक्रिय ऑर्डर नहीं है।')}</p>) : (activities.length ? activities.slice(0, 4).map(activity => <div className="activity-row" key={activity.id}><span className={`activity-icon ${activity.positive ? 'tone-emerald' : 'tone-rose'}`}>{activity.positive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><span className="activity-copy"><strong>{activity.label}</strong><small>{activity.date}</small></span><strong className={activity.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{activity.positive ? '+' : '−'}{money(activity.amount)}</strong></div>) : <p className="empty-state">{t('noTransactionsYet')}</p>)}
        </section>
        <section className="glass-panel dashboard-list"><div className="list-heading"><div><p className="dashboard-eyebrow">{text('STAY ON TRACK', 'व्यवस्थित रहें')}</p><h2>{text('Open tasks', 'बाकी कार्य')}</h2></div><button onClick={() => onNavigate('tasks')}>{t('viewAll')} <ArrowRight size={14} /></button></div>
          {!current ? <p className="empty-state">{error ? text('Data unavailable', 'डेटा उपलब्ध नहीं है') : text('Loading...', 'लोड हो रहा है...')}</p> : openTasks.length ? openTasks.slice(0, 4).map(task => <div className="activity-row" key={task.id}><span className="activity-icon tone-amber"><CheckCircle2 size={16} /></span><span className="activity-copy"><strong>{task.title}</strong><small>{task.dueDate || text('No due date', 'कोई तारीख नहीं')}</small></span></div>) : <p className="empty-state">{text('No open tasks for this workspace.', 'इस कार्यक्षेत्र के लिए कोई बाकी कार्य नहीं है।')}</p>}
        </section>
      </div>
    </div>
  );
};
