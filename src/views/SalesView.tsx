import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Sparkles,
  Send,
  Calendar,
  CheckCircle2,
  Trash2,
  TrendingUp,
  CreditCard,
  DollarSign,
  Building2,
  Tag,
  User,
  Package
} from 'lucide-react';
import { db } from '../services/db';
import { BusinessId, BUSINESSES, Sale, SaleItem } from '../types/database';
import { useTranslation } from '../services/i18n';
import { aiAgent } from '../services/aiAgent';
import { androidAutomation } from '../services/androidAutomation';

interface SalesViewProps {
  currentBusinessId: BusinessId;
}

type DateRangeFilter = 'all' | 'today' | 'month' | 'year';
type PaymentFilter = 'all' | 'cash' | 'upi' | 'online' | 'credit';

export const SalesView: React.FC<SalesViewProps> = ({ currentBusinessId }) => {
  const { t } = useTranslation();
  const [selectedBusinessId, setSelectedBusinessId] = useState<BusinessId | 'all'>(currentBusinessId);
  const [sales, setSales] = useState<Sale[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

  // Voice/Text AI bar state
  const [aiCommandText, setAiCommandText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Add Sale Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [targetBusinessId, setTargetBusinessId] = useState<BusinessId>(
    currentBusinessId === 'personal' ? 'jain-sweets' : currentBusinessId
  );
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'online' | 'credit'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemUnit, setItemUnit] = useState('pcs');
  const [itemPrice, setItemPrice] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleNotes, setSaleNotes] = useState('');

  const loadSales = async () => {
    const list = await db.getSales(selectedBusinessId === 'all' ? undefined : selectedBusinessId);
    setSales(list);
  };

  useEffect(() => {
    setSelectedBusinessId(currentBusinessId);
    if (currentBusinessId !== 'personal') {
      setTargetBusinessId(currentBusinessId);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    loadSales();
    const unsub = db.subscribe(loadSales);
    return unsub;
  }, [selectedBusinessId]);

  // Handle Add Sale Submit
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmt = parseFloat(amount);
    if (isNaN(totalAmt) || totalAmt <= 0) return;

    const items: SaleItem[] = [];
    if (itemName.trim()) {
      const qty = parseFloat(itemQty) || 1;
      const prc = parseFloat(itemPrice) || totalAmt / qty;
      items.push({
        id: 'si_' + Date.now(),
        itemName: itemName.trim(),
        quantity: qty,
        unit: itemUnit,
        price: prc,
        total: totalAmt
      });
    }

    await db.addSale({
      businessId: targetBusinessId,
      amount: totalAmt,
      date: saleDate || new Date().toISOString().split('T')[0],
      paymentMethod,
      customerName: customerName.trim() || undefined,
      notes: saleNotes.trim() || undefined,
      items
    });

    // Reset Form
    setAmount('');
    setCustomerName('');
    setItemName('');
    setItemQty('1');
    setItemPrice('');
    setSaleNotes('');
    setShowAddForm(false);
  };

  // Execute AI Voice/Text command directly for sales
  const handleExecuteAICommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiCommandText.trim()) return;

    setIsProcessingAI(true);
    setAiFeedback(null);

    const activeBiz = selectedBusinessId === 'all' ? 'jain-sweets' : selectedBusinessId;
    try {
      const res = await aiAgent.processCommand(aiCommandText, activeBiz);
      androidAutomation.playSoundEffect('success');
      setAiFeedback(res.result.speech_response);
      setAiCommandText('');
      await loadSales();
    } catch (err: any) {
      setAiFeedback(err?.message || 'Failed to process sales command');
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Filter Sales list
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.slice(0, 7);
  const thisYearStr = todayStr.slice(0, 4);

  const filteredSales = sales.filter((s) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchItem = s.items?.some((i) => i.itemName.toLowerCase().includes(q));
      const matchCust = s.customerName?.toLowerCase().includes(q);
      const matchId = s.id.toLowerCase().includes(q);
      const matchBiz = s.businessId.toLowerCase().includes(q);
      if (!matchItem && !matchCust && !matchId && !matchBiz) return false;
    }

    // Date range filter
    if (dateFilter === 'today' && s.date !== todayStr) return false;
    if (dateFilter === 'month' && !s.date.startsWith(thisMonthStr)) return false;
    if (dateFilter === 'year' && !s.date.startsWith(thisYearStr)) return false;

    // Payment method filter
    if (paymentFilter !== 'all' && s.paymentMethod !== paymentFilter) return false;

    return true;
  });

  // Calculate Aggregations
  const dailySalesTotal = sales.filter((s) => s.date === todayStr).reduce((sum, s) => sum + s.amount, 0);
  const monthlySalesTotal = sales.filter((s) => s.date.startsWith(thisMonthStr)).reduce((sum, s) => sum + s.amount, 0);
  const yearlySalesTotal = sales.filter((s) => s.date.startsWith(thisYearStr)).reduce((sum, s) => sum + s.amount, 0);
  const totalFilteredSales = filteredSales.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto pb-28">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-amber-600 dark:text-amber-400">
            {t('salesManagement')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time daily sales, transaction ledger, and AI voice sales recording
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{t('recordSaleBtn')}</span>
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
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : biz.color}`} />
              <span>{biz.name}</span>
            </button>
          );
        })}
      </div>

      {/* AI Voice & Text Sales Assistant Bar */}
      <form onSubmit={handleExecuteAICommand} className="relative">
        <div className="p-1 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 dark:from-amber-500/30 dark:to-orange-500/30 border border-amber-500/30 shadow-md">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-3 py-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
            <input
              type="text"
              value={aiCommandText}
              onChange={(e) => setAiCommandText(e.target.value)}
              placeholder="Record Sale via Voice/Text (e.g. 150 ki Kaju Katli UPI se bechi...)"
              className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isProcessingAI}
              className="py-1.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
            >
              {isProcessingAI ? <span className="animate-spin text-xs">⏳</span> : <Send className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Record</span>
            </button>
          </div>
        </div>
        {aiFeedback && (
          <div className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{aiFeedback}</span>
          </div>
        )}
      </form>

      {/* Aggregations Cards (Daily, Monthly, Yearly, Total Filtered) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Today Sales */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Today's Sales</div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            ₹{dailySalesTotal.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {sales.filter((s) => s.date === todayStr).length} transactions
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">This Month Sales</div>
          <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
            ₹{monthlySalesTotal.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {sales.filter((s) => s.date.startsWith(thisMonthStr)).length} transactions
          </div>
        </div>

        {/* Yearly Sales */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">This Year Sales</div>
          <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
            ₹{yearlySalesTotal.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {sales.filter((s) => s.date.startsWith(thisYearStr)).length} transactions
          </div>
        </div>

        {/* Filtered Sales Overview */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Filtered Total</div>
          <div className="text-lg font-black text-amber-500 mt-0.5">
            ₹{totalFilteredSales.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {filteredSales.length} record(s)
          </div>
        </div>
      </div>

      {/* Add Sale Manual Modal Form */}
      {showAddForm && (
        <form onSubmit={handleAddSale} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/40 space-y-3 shadow-lg animate-in fade-in">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>{t('recordNewSale')}</span>
            <span className="text-[10px] text-slate-400">Manual Entry</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Target Business*</label>
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
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('totalAmountRupees')}*</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('paymentMethod')}*</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="online">Online / Card</option>
                <option value="credit">Credit (Udhar)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Product / Item Name</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Kaju Katli / Samosa"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Quantity & Unit</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  placeholder="Qty"
                  className="w-1/2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
                <select
                  value={itemUnit}
                  onChange={(e) => setItemUnit(e.target.value)}
                  className="w-1/2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="pcs">pcs</option>
                  <option value="kg">kg</option>
                  <option value="liters">liters</option>
                  <option value="packets">packets</option>
                  <option value="plates">plates</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Customer Name (Optional)</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Suresh Kumar"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Date</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Notes / Special Instructions</label>
              <input
                type="text"
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                placeholder="e.g. Bulk festival order, discount applied..."
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
              className="py-2 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-600 transition"
            >
              {t('saveSaleRecord')}
            </button>
          </div>
        </form>
      )}

      {/* Search & Filters Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sale by product, customer, or ID..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          {(['all', 'today', 'month', 'year'] as DateRangeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1 rounded-lg font-bold capitalize transition ${
                dateFilter === f
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'today' ? 'Today' : f === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>

        {/* Payment Filter */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-semibold"
        >
          <option value="all">All Payment Methods</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="online">Online / Card</option>
          <option value="credit">Credit (Udhar)</option>
        </select>
      </div>

      {/* Sales Transaction History List */}
      <div className="space-y-2">
        {filteredSales.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-2 shadow-sm">
            <ShoppingBag className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-300">
              {t('noTransactionsYet')}
            </div>
            <p className="text-xs text-slate-500">
              No sales recorded for the selected business and filters. Record a sale manually or via voice command.
            </p>
          </div>
        ) : (
          filteredSales.map((s) => {
            const bizInfo = BUSINESSES[s.businessId];
            return (
              <div
                key={s.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm hover:border-amber-500/30 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {s.items?.[0]?.itemName || 'General Sale'}
                      </span>
                      {s.items?.[0] && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          ({s.items[0].quantity} {s.items[0].unit})
                        </span>
                      )}
                      <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {s.paymentMethod}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{bizInfo?.name}</span>
                      <span>•</span>
                      <span>Date: {s.date}</span>
                      {s.customerName && (
                        <>
                          <span>•</span>
                          <span>Customer: {s.customerName}</span>
                        </>
                      )}
                      {s.notes && (
                        <>
                          <span>•</span>
                          <span className="italic">"{s.notes}"</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      +₹{s.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <button
                    onClick={() => db.deleteSale(s.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                    title="Delete Sale Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
