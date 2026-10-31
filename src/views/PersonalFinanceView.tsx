import { translateText } from '../services/i18n';
import React, { useEffect, useState } from 'react';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  PhoneCall,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  UserPlus,
  Send,
  Mic,
  Sparkles,
  Trash2,
  TrendingUp,
  AlertCircle,
  Phone,
  Check,
  User,
  ListTodo,
  BookOpen,
  DollarSign
} from 'lucide-react';
import { db } from '../services/db';
import {
  PersonalTransaction,
  PersonalContact,
  Receivable,
  Payable,
  Task,
  Reminder,
  Note
} from '../types/database';
import { aiAgent, type ParsedAgentResult } from '../services/aiAgent';
import { androidAutomation } from '../services/androidAutomation';
import { i18n } from '../services/i18n';

type DateFilter = 'all' | 'today' | 'month' | 'year';
type ActiveSubTab = 'transactions' | 'receivables_payables' | 'contacts' | 'tasks_reminders' | 'notes' | 'summary';

export const PersonalFinanceView: React.FC<{ onRequestConfirmation?: (result: ParsedAgentResult) => void }> = ({ onRequestConfirmation }) => {
  const [activeTab, setActiveTab] = useState<ActiveSubTab>('tasks_reminders');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [currentLang, setCurrentLang] = useState(i18n.getLanguage());

  // Data states
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [contacts, setContacts] = useState<PersonalContact[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // AI Voice & Text input
  const [commandText, setCommandText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiResponseMsg, setAiResponseMsg] = useState<string | null>(null);

  // Form toggles
  const [showAddTx, setShowAddTx] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Personal');
  const [txNotes, setTxNotes] = useState('');
  const [txMethod, setTxMethod] = useState<'cash' | 'upi' | 'bank' | 'card'>('upi');

  // Contact form
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRel, setContactRel] = useState('');

  // Udhari / Receivable & Payable form
  const [showAddUdhar, setShowAddUdhar] = useState(false);
  const [udharKind, setUdharKind] = useState<'receivable' | 'payable'>('receivable');
  const [udharPerson, setUdharPerson] = useState('');
  const [udharAmount, setUdharAmount] = useState('');
  const [udharPhone, setUdharPhone] = useState('');

  // Task form
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Note form
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const loadData = async () => {
    const [txList, contactList, recList, payList, taskList, remList, noteList] = await Promise.all([
      db.getPersonalTransactions(),
      db.getPersonalContacts(),
      db.getReceivables('personal'),
      db.getPayables('personal'),
      db.getTasks(),
      db.getReminders(),
      db.getNotes()
    ]);

    setTransactions(txList);
    setContacts(contactList);
    setReceivables(recList);
    setPayables(payList);
    setTasks(taskList.filter(task => task.businessId === 'personal'));
    setReminders(remList.filter(reminder => reminder.businessId === 'personal'));
    setNotes(noteList);
  };

  useEffect(() => {
    loadData();
    const unsubDb = db.subscribe(loadData);
    const unsubLang = i18n.subscribe(() => setCurrentLang(i18n.getLanguage()));
    return () => {
      unsubDb();
      unsubLang();
    };
  }, []);

  // Filter transactions by date range
  const filteredTransactions = transactions.filter((t) => {
    if (dateFilter === 'all') return true;
    const today = new Date().toISOString().split('T')[0];
    if (dateFilter === 'today') return t.date === today;
    if (dateFilter === 'month') return t.date.slice(0, 7) === today.slice(0, 7);
    if (dateFilter === 'year') return t.date.slice(0, 4) === today.slice(0, 4);
    return true;
  });

  // Calculate totals
  const totalIncome = filteredTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netCashBalance = totalIncome - totalExpense;

  const totalReceivable = receivables.filter((r) => r.status !== 'paid').reduce((sum, r) => sum + (r.amount - r.paidAmount), 0);
  const totalPayable = payables.filter((p) => p.status !== 'paid').reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);

  // Form Submitters
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) return;

    await db.addPersonalTransaction({
      type: txType,
      amount: amt,
      category: txCategory,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: txMethod,
      notes: txNotes.trim() || undefined
    });

    setTxAmount('');
    setTxNotes('');
    setShowAddTx(false);
  };

  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;

    await db.addPersonalContact({
      name: contactName.trim(),
      phone: contactPhone.trim(),
      relationship: contactRel.trim() || undefined
    });

    setContactName('');
    setContactPhone('');
    setContactRel('');
    setShowAddContact(false);
  };

  const handleAddUdharSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(udharAmount);
    if (isNaN(amt) || amt <= 0 || !udharPerson.trim()) return;

    if (udharKind === 'receivable') {
      await db.addReceivable({
        businessId: 'personal',
        customerName: udharPerson.trim(),
        contact: udharPhone.trim() || undefined,
        amount: amt
      });
    } else {
      await db.addPayable({
        businessId: 'personal',
        supplierName: udharPerson.trim(),
        contact: udharPhone.trim() || undefined,
        amount: amt
      });
    }

    setUdharPerson('');
    setUdharAmount('');
    setUdharPhone('');
    setShowAddUdhar(false);
  };

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    await db.addTask({
      title: taskTitle.trim(),
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
      businessId: 'personal'
    });

    setTaskTitle('');
    setTaskDueDate('');
    setShowAddTask(false);
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    await db.addNote({
      title: noteTitle.trim(),
      content: noteContent.trim(),
      isVoiceNote: false
    });

    setNoteTitle('');
    setNoteContent('');
    setShowAddNote(false);
  };

  // Run AI command from prompt input
  const handleExecuteAICommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandText.trim()) return;

    setIsProcessingAI(true);
    setAiResponseMsg(null);

    try {
      const message = await aiAgent.runQuickCommand(commandText, 'personal', onRequestConfirmation);
      setAiResponseMsg(message);
      setCommandText('');
      await loadData();
    } catch (err: any) {
      setAiResponseMsg(err?.message || 'Command processing failed.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto pb-28">
      {/* Header & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-amber-500 dark:text-amber-400">
              {i18n.t('personalFinanceTitle')}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">{translateText("Owner Private")}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{translateText("Manage your personal tasks, reminders, notes, contacts and finances")}</p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800 text-xs">
          {(['all', 'today', 'month', 'year'] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1 rounded-lg font-bold capitalize transition ${
                dateFilter === f
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f === 'all' ? translateText("All") : f === 'today' ? translateText("Today") : f === 'month' ? translateText("This Month") : translateText("This Year")}
            </button>
          ))}
        </div>
      </div>

      {/* Instant Voice & Text Command Bar */}
      <form onSubmit={handleExecuteAICommand} className="relative group">
        <div className="p-1 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-400/20 dark:from-amber-500/30 dark:to-amber-500/30 border border-amber-500/30 shadow-lg">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-3 py-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            <input
              type="text"
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              placeholder={translateText("Voice/Text Command in Hindi, English, Hinglish (e.g. 500 auto expense, 2000 from Papa...)")}
              className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isProcessingAI}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
            >
              {isProcessingAI ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{translateText("Execute")}</span>
                </>
              )}
            </button>
          </div>
        </div>
        {aiResponseMsg && (
          <div className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{aiResponseMsg}</span>
          </div>
        )}
      </form>

      {/* Metric Cards Grid (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Net Cash Balance */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/30 shadow-sm relative overflow-hidden">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{translateText("Net Cash Balance")}</div>
          <div className={`text-lg font-black mt-1 ${netCashBalance >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
            ₹{netCashBalance.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{translateText("Wallet & Cash in Hand")}</div>
        </div>

        {/* Money Received / Income */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{translateText("Money Received")}</div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{totalIncome.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{filteredTransactions.filter(t => t.type === 'income').length}{" " + translateText("entries")}</div>
        </div>

        {/* Money Paid / Expenses */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{translateText("Money Paid (Expenses)")}</div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
            ₹{totalExpense.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{filteredTransactions.filter(t => t.type === 'expense').length}{" " + translateText("entries")}</div>
        </div>

        {/* Pending Receivables (Lene Hai) */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{translateText("Receivables (Lene Hai)")}</div>
          <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">
            ₹{totalReceivable.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{translateText("Pending from others")}</div>
        </div>

        {/* Pending Payables (Dene Hai) */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{translateText("Payables (Dene Hai)")}</div>
          <div className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1">
            ₹{totalPayable.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{translateText("Owed to others")}</div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'tasks_reminders', label: translateText('Tasks & Reminders'), icon: ListTodo },
          { id: 'transactions', label: translateText('Transactions'), icon: Wallet },
          { id: 'receivables_payables', label: translateText('Receivables & Payables'), icon: DollarSign },
          { id: 'contacts', label: translateText('Contacts'), icon: User },
          { id: 'notes', label: translateText('Notes'), icon: BookOpen },
          { id: 'summary', label: translateText('Summary'), icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveSubTab)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: TRANSACTIONS & LEDGER */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{translateText("Personal Income & Expenses (")}{filteredTransactions.length})
            </h3>
            <button
              onClick={() => setShowAddTx(!showAddTx)}
              className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{translateText("Add Entry")}</span>
            </button>
          </div>

          {showAddTx && (
            <form onSubmit={handleAddTransaction} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 space-y-3 shadow-md">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{translateText("New Personal Transaction")}</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Type")}</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="expense">{translateText("Expense (Spent / Money Paid)")}</option>
                    <option value="income">{translateText("Income (Received / Money In)")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Amount (₹)*")}</label>
                  <input
                    type="number"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder={translateText("e.g. 500")}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Payment Method")}</label>
                  <select
                    value={txMethod}
                    onChange={(e) => setTxMethod(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="upi">{translateText("UPI / GPay / PhonePe")}</option>
                    <option value="cash">{translateText("Cash")}</option>
                    <option value="bank">{translateText("Bank Transfer")}</option>
                    <option value="card">{translateText("Credit/Debit Card")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Category & Notes")}</label>
                  <input
                    type="text"
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    placeholder={translateText("e.g. Petrol, Groceries, Salary...")}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddTx(false)}
                  className="py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >{translateText("Cancel")}</button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                >{translateText("Save Entry")}</button>
              </div>
            </form>
          )}

          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
              <Wallet className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{translateText("No personal transactions recorded")}</div>
              <p className="text-xs text-slate-500">{translateText("Record income and personal expenses or speak voice commands above.")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-amber-500/30 transition shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                      {t.type === 'income' ? <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" /> : <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{t.notes || t.category}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{t.date}</span>
                        <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">{t.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-sm font-extrabold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                    </div>
                    <button
                      onClick={() => db.deletePersonalTransaction(t.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                      title={translateText("Delete entry")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECEIVABLES & PAYABLES (UDHARI LEDGER) */}
      {activeTab === 'receivables_payables' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{translateText("Personal Receivables & Payables (Udhari / Lene-Dene)")}</h3>
              <p className="text-xs text-slate-500">{translateText("Track money owed to you or money you need to pay")}</p>
            </div>
            <button
              onClick={() => setShowAddUdhar(!showAddUdhar)}
              className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{translateText("Add Record")}</span>
            </button>
          </div>

          {showAddUdhar && (
            <form onSubmit={handleAddUdharSubmit} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 space-y-3 shadow-md">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{translateText("Add Personal Receivable / Payable")}</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Type")}</label>
                  <select
                    value={udharKind}
                    onChange={(e) => setUdharKind(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="receivable">{translateText("Receivable (Lene Hai / Get money)")}</option>
                    <option value="payable">{translateText("Payable (Dene Hai / Pay money)")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Person Name*")}</label>
                  <input
                    type="text"
                    required
                    value={udharPerson}
                    onChange={(e) => setUdharPerson(e.target.value)}
                    placeholder={translateText("e.g. Ramesh Sharma")}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Amount (₹)*")}</label>
                  <input
                    type="number"
                    required
                    value={udharAmount}
                    onChange={(e) => setUdharAmount(e.target.value)}
                    placeholder={translateText("e.g. 1500")}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Phone Number (Optional)")}</label>
                  <input
                    type="tel"
                    value={udharPhone}
                    onChange={(e) => setUdharPhone(e.target.value)}
                    placeholder={translateText("e.g. 9876543210")}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddUdhar(false)}
                  className="py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >{translateText("Cancel")}</button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >{translateText("Save Record")}</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Receivables List */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{translateText("Receivables (Lene Hai)")}</span>
                </h4>
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">₹{totalReceivable.toLocaleString('en-IN')}</span>
              </div>
              {receivables.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">{translateText("No pending receivables")}</div>
              ) : (
                receivables.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{r.customerName}</div>
                      {r.contact && (
                        <button
                          onClick={() => androidAutomation.initiatePhoneCall(r.contact!)}
                          className="text-[11px] text-amber-500 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{r.contact}</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">₹{r.amount}</span>
                      {r.status !== 'paid' && (
                        <button
                          onClick={() => db.markReceivablePaid(r.id)}
                          className="py-1 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 hover:bg-emerald-500/20"
                        >{translateText("Mark Settled")}</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payables List */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{translateText("Payables (Dene Hai)")}</span>
                </h4>
                <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">₹{totalPayable.toLocaleString('en-IN')}</span>
              </div>
              {payables.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">{translateText("No pending payables")}</div>
              ) : (
                payables.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{p.supplierName}</div>
                      {p.contact && (
                        <button
                          onClick={() => androidAutomation.initiatePhoneCall(p.contact!)}
                          className="text-[11px] text-amber-500 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{p.contact}</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-purple-600 dark:text-purple-400">₹{p.amount}</span>
                      {p.status !== 'paid' && (
                        <button
                          onClick={() => db.markPayablePaid(p.id)}
                          className="py-1 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 hover:bg-emerald-500/20"
                        >{translateText("Mark Paid")}</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTACTS DIRECTORY */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{translateText("Personal Contacts (")}{contacts.length})
              </h3>
              <p className="text-xs text-slate-500">{translateText("Direct phone call integration & personal address book")}</p>
            </div>
            <button
              onClick={() => setShowAddContact(!showAddContact)}
              className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{translateText("Add Contact")}</span>
            </button>
          </div>

          {showAddContact && (
            <form onSubmit={handleAddContactSubmit} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 space-y-3 shadow-md">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{translateText("Add New Contact")}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Name*")}</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={translateText("e.g. Doctor Uncle, Supplier...")}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Phone Number*")}</label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder={translateText("e.g. 9876543210")}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Relationship / Tag")}</label>
                  <input
                    type="text"
                    value={contactRel}
                    onChange={(e) => setContactRel(e.target.value)}
                    placeholder={translateText("e.g. Family, Work, Electrician")}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >{translateText("Cancel")}</button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >{translateText("Save Contact")}</button>
              </div>
            </form>
          )}

          {contacts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
              <User className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{translateText("No personal contacts added")}</div>
              <p className="text-xs text-slate-500">{translateText("Save contacts here for quick one-tap calling using voice or call buttons.")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {contacts.map((c) => (
                <div key={c.id} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black flex items-center justify-center text-sm">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{c.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.phone}</div>
                      {c.relationship && (
                        <span className="text-[9px] font-semibold text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {c.relationship}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => androidAutomation.initiatePhoneCall(c.phone)}
                      className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition"
                      title={translateText("Call Contact")}
                    >
                      <PhoneCall className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => db.deletePersonalContact(c.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                      title={translateText("Delete Contact")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TASKS & REMINDERS */}
      {activeTab === 'tasks_reminders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{translateText("Personal Tasks & Scheduled Reminders (")}{tasks.length + reminders.length})
              </h3>
              <p className="text-xs text-slate-500 font-normal">{translateText("Stay organized with routine reminders and to-do lists")}</p>
            </div>
            <button
              onClick={() => setShowAddTask(!showAddTask)}
              className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{translateText("Add Task")}</span>
            </button>
          </div>

          {showAddTask && (
            <form onSubmit={handleAddTaskSubmit} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 space-y-3 shadow-md">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{translateText("Create Task / To-Do")}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Task Description*")}</label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder={translateText("e.g. Pay electricity bill, Renew insurance...")}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Priority")}</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="low">{translateText("Low Priority")}</option>
                    <option value="medium">{translateText("Medium Priority")}</option>
                    <option value="high">{translateText("High Priority")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{translateText("Due Date")}</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >{translateText("Cancel")}</button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >{translateText("Save Task")}</button>
              </div>
            </form>
          )}

          {tasks.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
              <ListTodo className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{translateText("No tasks created yet")}</div>
              <p className="text-xs text-slate-500">{translateText("Add tasks manually or command GopalAI: \"Recharge ka reminder lagao tomorrow 10am\".")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                    t.completed
                      ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => db.toggleTask(t.id)}
                      className={`w-5 h-5 rounded-lg flex items-center justify-center transition border ${
                        t.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-400 dark:border-slate-600 hover:border-amber-500'
                      }`}
                    >
                      {t.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                    <div>
                      <div className={`text-xs font-bold ${t.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {t.title}
                      </div>
                      {t.dueDate && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{translateText("Due:") + " "}{t.dueDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        t.priority === 'high'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : t.priority === 'medium'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {t.priority}
                    </span>
                    <button
                      onClick={() => db.deleteTask(t.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <section className="space-y-2" aria-label={translateText('Reminders')}>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{translateText('Reminders')}</h4>
            {reminders.length === 0 ? <p className="text-xs text-slate-500">{translateText('No scheduled reminders.')}</p> : reminders.map(reminder => (
              <div key={reminder.id} className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="text-xs font-bold text-slate-900 dark:text-slate-100 break-words">{reminder.title}</div><div className="text-[11px] text-slate-500 mt-1">{new Date(reminder.dateTime).toLocaleString()}</div></div>
                <button onClick={() => db.deleteReminder(reminder.id)} aria-label={`${translateText('Delete')} ${reminder.title}`} className="p-2 rounded text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* TAB 5: NOTES & VOICE NOTES */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{translateText("Personal Notes & Memos (")}{notes.length})
              </h3>
              <p className="text-xs text-slate-500">{translateText("Quick scratchpad for thoughts, lists, and voice transcripts")}</p>
            </div>
            <button
              onClick={() => setShowAddNote(!showAddNote)}
              className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{translateText("New Note")}</span>
            </button>
          </div>

          {showAddNote && (
            <form onSubmit={handleAddNoteSubmit} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 space-y-3 shadow-md">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{translateText("Write Personal Note")}</div>
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder={translateText("Title (e.g. Shopping List, Important Document IDs)")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
                <textarea
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder={translateText("Write content here...")}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddNote(false)}
                  className="py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >{translateText("Cancel")}</button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >{translateText("Save Note")}</button>
              </div>
            </form>
          )}

          {notes.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
              <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{translateText("No notes written")}</div>
              <p className="text-xs text-slate-500">{translateText("Create notes to keep track of ideas or dictation.")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {notes.map((n) => (
                <div key={n.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm relative group">
                  <div className="flex items-start justify-between">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{n.title}</h4>
                    <button
                      onClick={() => db.deleteNote(n.id)}
                      className="text-slate-400 hover:text-rose-500 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SUMMARY & ANALYTICS */}
      {activeTab === 'summary' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{translateText("Personal Cash Flow Summary (")}{dateFilter.toUpperCase()})
            </h3>
            <p className="text-xs text-slate-500">{translateText("Automated ledger overview saved permanently in database")}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">{translateText("Total Money Received (Income)")}</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">₹{totalIncome.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">{translateText("Total Money Paid (Expenses)")}</span>
              <span className="font-extrabold text-rose-600 dark:text-rose-400">₹{totalExpense.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">{translateText("Net Wallet Balance")}</span>
              <span className="font-black text-amber-600 dark:text-amber-400 text-sm">₹{netCashBalance.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">{translateText("Pending Receivables (Lene Hai)")}</span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400">₹{totalReceivable.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-xs py-2">
              <span className="text-slate-600 dark:text-slate-400">{translateText("Pending Payables (Dene Hai)")}</span>
              <span className="font-extrabold text-purple-600 dark:text-purple-400">₹{totalPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
