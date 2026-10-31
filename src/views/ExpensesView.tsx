import React, { useEffect, useState } from 'react';
import { TrendingDown, Plus, Tag, Building2, Search } from 'lucide-react';
import { db } from '../services/db';
import { BusinessId, BUSINESSES, Expense, ExpenseCategory } from '../types/database';
import { useTranslation } from '../services/i18n';

interface ExpensesViewProps {
  currentBusinessId: BusinessId;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ currentBusinessId }) => {
  const { t } = useTranslation();
  const [selectedBusinessId, setSelectedBusinessId] = useState<BusinessId | 'all'>(currentBusinessId);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [targetBusinessId, setTargetBusinessId] = useState<BusinessId>(
    currentBusinessId === 'personal' ? 'jain-sweets' : currentBusinessId
  );
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('raw_materials');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank' | 'credit'>('cash');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadExpenses = async () => {
    const list = await db.getExpenses(selectedBusinessId === 'all' ? undefined : selectedBusinessId);
    setExpenses(list);
  };

  useEffect(() => {
    setSelectedBusinessId(currentBusinessId);
    if (currentBusinessId !== 'personal') {
      setTargetBusinessId(currentBusinessId);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    loadExpenses();
    const unsub = db.subscribe(loadExpenses);
    return unsub;
  }, [selectedBusinessId]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;

    await db.addExpense({
      businessId: targetBusinessId,
      amount: amt,
      category,
      date: new Date().toISOString().split('T')[0],
      paymentMethod,
      notes: notes.trim() || undefined
    });

    setAmount('');
    setNotes('');
    setShowAddForm(false);
  };

  const filteredExpenses = expenses.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.notes?.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.businessId.toLowerCase().includes(q)
    );
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto pb-28">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{t('expenseManagement')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track operating expenses, raw material costs, rent & utility bills</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="py-2 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{t('recordExpenseBtn')}</span>
        </button>
      </div>

      {/* Workspace Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'jain-sweets', name: 'Jain Sweets', color: 'text-amber-500' },
          { id: 'paan-bai', name: 'Paan Bai Canteen', color: 'text-emerald-500' },
          { id: 'kesarwadi', name: 'Kesarwadi Canteen', color: 'text-orange-500' },
          { id: 'gopal-caterers', name: 'Gopal Caterers', color: 'text-purple-500' },
          { id: 'personal', name: 'Personal Wallet', color: 'text-blue-500' },
          { id: 'all', name: 'All Workspaces', color: 'text-indigo-500' }
        ].map((biz) => {
          const isActive = selectedBusinessId === biz.id;
          return (
            <button
              key={biz.id}
              onClick={() => setSelectedBusinessId(biz.id as any)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition ${
                isActive
                  ? 'bg-rose-500 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-white' : biz.color}`} />
              <span>{biz.name}</span>
            </button>
          );
        })}
      </div>

      {/* Summary Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('totalExpensesRecorded')}</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">₹{totalExpenses.toLocaleString('en-IN')}</div>
        </div>
        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
          <div className="font-bold text-slate-800 dark:text-slate-200">{filteredExpenses.length} {t('entries')}</div>
        </div>
      </div>

      {/* Add Expense Form */}
      {showAddForm && (
        <form onSubmit={handleAddExpense} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/40 space-y-3 shadow-lg animate-in fade-in">
          <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            {t('recordNewExpense')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Workspace*</label>
              <select
                value={targetBusinessId}
                onChange={(e) => setTargetBusinessId(e.target.value as BusinessId)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="jain-sweets">Jain Sweets</option>
                <option value="paan-bai">Paan Bai Canteen</option>
                <option value="kesarwadi">Kesarwadi Canteen</option>
                <option value="gopal-caterers">Gopal Caterers</option>
                <option value="personal">Personal Finance</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('amountRupees')}*</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1200"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="raw_materials">{t('rawMaterials')}</option>
                <option value="electricity">{t('electricity')}</option>
                <option value="rent">{t('rent')}</option>
                <option value="staff_salary">{t('staffSalary')}</option>
                <option value="transportation">{t('transportation')}</option>
                <option value="packaging">{t('packaging')}</option>
                <option value="maintenance">{t('maintenance')}</option>
                <option value="other">{t('otherExpenses')}</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('paymentMethod')}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="cash">{t('cash')}</option>
                <option value="upi">{t('upi')}</option>
                <option value="bank">Bank Transfer</option>
                <option value="credit">Credit / Payable</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('notesDescription')}</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Milk bill / Sugar stock purchase"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs hover:brightness-110"
            >
              {t('saveExpense')}
            </button>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search expense by category or notes..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredExpenses.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-2 shadow-sm">
            <TrendingDown className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-300">{t('noTransactionsYet')}</div>
            <p className="text-xs text-slate-500">Add operational costs using voice command or the form above.</p>
          </div>
        ) : (
          filteredExpenses.map((e) => {
            const bizInfo = BUSINESSES[e.businessId];
            return (
              <div key={e.id} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">
                      {e.category.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {e.paymentMethod}
                    </span>
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                      {bizInfo?.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Date: {e.date} {e.notes ? `• ${e.notes}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400">-₹{e.amount.toLocaleString('en-IN')}</div>
                  <button
                    onClick={() => db.deleteExpense(e.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition"
                    title="Delete Expense"
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
