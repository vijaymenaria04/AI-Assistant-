import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Search,
  DollarSign,
  Send,
  X,
  UserCheck,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { db } from '../services/db';
import {
  BusinessId,
  BUSINESSES,
  Receivable,
  Payable,
  PersonalTransaction,
  SupplierPayment
} from '../types/database';
import { androidAutomation } from '../services/androidAutomation';
import { aiAgent } from '../services/aiAgent';
import { useTranslation } from '../services/i18n';

interface PaymentsViewProps {
  currentBusinessId: BusinessId;
}

type DateFilter = 'all' | 'today' | 'month' | 'year';

export const PaymentsView: React.FC<PaymentsViewProps> = ({ currentBusinessId }) => {
  const { t } = useTranslation();
  const [selectedBusinessId, setSelectedBusinessId] = useState<BusinessId | 'all'>(currentBusinessId);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [personalTx, setPersonalTx] = useState<PersonalTransaction[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);

  // Add Credit / Receivable form
  const [showAddForm, setShowAddForm] = useState(false);
  const [recordKind, setRecordKind] = useState<'receivable' | 'payable'>('receivable');
  const [targetBusinessId, setTargetBusinessId] = useState<BusinessId>(
    currentBusinessId === 'personal' ? 'jain-sweets' : currentBusinessId
  );
  const [custName, setCustName] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash' | 'bank'>('upi');

  // Owner Confirmation Modal
  const [pendingConfirmationItem, setPendingConfirmationItem] = useState<{
    id: string;
    type: 'receivable' | 'payable';
    name: string;
    amount: number;
  } | null>(null);

  // Duplicate warning modal
  const [duplicateWarning, setDuplicateWarning] = useState<{
    actionPayload: any;
    message: string;
  } | null>(null);

  // AI Voice & Text bar
  const [aiCommandText, setAiCommandText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  const loadData = async () => {
    const isAll = selectedBusinessId === 'all';
    const [recList, payList, ptxList, supPayList] = await Promise.all([
      db.getReceivables(isAll ? undefined : selectedBusinessId),
      db.getPayables(isAll ? undefined : selectedBusinessId),
      db.getPersonalTransactions(),
      db.getSupplierPayments(isAll ? undefined : selectedBusinessId)
    ]);

    setReceivables(recList);
    setPayables(payList);
    setPersonalTx(ptxList);
    setSupplierPayments(supPayList);
  };

  useEffect(() => {
    setSelectedBusinessId(currentBusinessId);
    if (currentBusinessId !== 'personal') {
      setTargetBusinessId(currentBusinessId);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, [selectedBusinessId]);

  // Idempotency / Duplicate Check
  const checkIsDuplicate = (name: string, amt: number, bizId: BusinessId, kind: 'receivable' | 'payable'): boolean => {
    const today = new Date().toISOString().split('T')[0];
    if (kind === 'receivable') {
      return receivables.some(
        (r) =>
          r.businessId === bizId &&
          r.customerName.toLowerCase() === name.toLowerCase() &&
          r.amount === amt &&
          r.createdAt.startsWith(today)
      );
    } else {
      return payables.some(
        (p) =>
          p.businessId === bizId &&
          p.supplierName.toLowerCase() === name.toLowerCase() &&
          p.amount === amt &&
          p.createdAt.startsWith(today)
      );
    }
  };

  // Submit Receivable or Payable record
  const handleRecordSubmit = async (e: React.FormEvent, forceBypassDuplicate = false) => {
    if (e) e.preventDefault();
    const amt = parseFloat(amount);
    if (!custName.trim() || isNaN(amt) || amt <= 0) return;

    // Check duplicate
    if (!forceBypassDuplicate && checkIsDuplicate(custName, amt, targetBusinessId, recordKind)) {
      setDuplicateWarning({
        actionPayload: { custName, amt, targetBusinessId, recordKind, phone, dueDate },
        message: `Duplicate Payment Warning: A ${recordKind} record of ₹${amt} for "${custName}" was already logged today.`
      });
      return;
    }

    if (recordKind === 'receivable') {
      await db.addReceivable({
        businessId: targetBusinessId,
        customerName: custName.trim(),
        contact: phone.trim() || undefined,
        dueDate: dueDate || undefined,
        amount: amt
      });
    } else {
      await db.addPayable({
        businessId: targetBusinessId,
        supplierName: custName.trim(),
        contact: phone.trim() || undefined,
        dueDate: dueDate || undefined,
        amount: amt
      });
    }

    setCustName('');
    setAmount('');
    setPhone('');
    setDueDate('');
    setShowAddForm(false);
    setDuplicateWarning(null);
  };

  // Execute Owner Confirmation for marking paid
  const handleConfirmExecutePayment = async () => {
    if (!pendingConfirmationItem) return;

    if (pendingConfirmationItem.type === 'receivable') {
      await db.markReceivablePaid(pendingConfirmationItem.id);
    } else {
      await db.markPayablePaid(pendingConfirmationItem.id);
    }

    androidAutomation.playSoundEffect('success');
    setPendingConfirmationItem(null);
  };

  // AI Voice & Text Command processing
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
      await loadData();
    } catch (err: any) {
      setAiFeedback(err?.message || 'Failed to process command');
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Send Payment Reminder via WhatsApp
  const sendReminder = (name: string, phone: string | undefined, amt: number, kind: 'receivable' | 'payable') => {
    const message = kind === 'receivable'
      ? `Namaste ${name}, kindly settle your pending balance of ₹${amt.toLocaleString('en-IN')}. Thank you!`
      : `Namaste ${name}, payment of ₹${amt.toLocaleString('en-IN')} is scheduled. Kindly confirm bank/UPI details.`;
    
    if (phone) {
      const cleanPhone = phone.replace(/[^\d]/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    } else {
      androidAutomation.initiatePhoneCall(name);
    }
  };

  // Calculate Totals
  const totalReceivables = receivables.filter(r => r.status !== 'paid').reduce((sum, r) => sum + (r.amount - r.paidAmount), 0);
  const totalPayables = payables.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);
  const totalSupplierPaid = supplierPayments.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto pb-28">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-amber-600 dark:text-amber-400">
            Payment Management & Credit Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Customer receivables, supplier payables, owner confirmation, and duplicate prevention
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Credit Entry</span>
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
          { id: 'all', name: 'All Accounts', color: 'text-indigo-500' }
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

      {/* Voice & Text Command Bar */}
      <form onSubmit={handleExecuteAICommand} className="relative">
        <div className="p-1 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 dark:from-amber-500/30 dark:to-orange-500/30 border border-amber-500/30 shadow-md">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-3 py-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
            <input
              type="text"
              value={aiCommandText}
              onChange={(e) => setAiCommandText(e.target.value)}
              placeholder="Payment Command (e.g. Ramesh se 1500 lene hai, Doctor uncle ko 2000 paid...)"
              className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isProcessingAI}
              className="py-1.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
            >
              {isProcessingAI ? <span className="animate-spin text-xs">⏳</span> : <Send className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Execute</span>
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Customer Receivables */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Customer Credit (Lene Hai)</div>
          <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
            ₹{totalReceivables.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{receivables.filter(r => r.status !== 'paid').length} pending accounts</div>
        </div>

        {/* Pending Payables */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pending Dues (Dene Hai)</div>
          <div className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">
            ₹{totalPayables.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{payables.filter(p => p.status !== 'paid').length} pending payables</div>
        </div>

        {/* Supplier Paid Total */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Supplier Payments</div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            ₹{totalSupplierPaid.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{supplierPayments.length} transactions executed</div>
        </div>
      </div>

      {/* Add Entry Form Modal */}
      {showAddForm && (
        <form onSubmit={(e) => handleRecordSubmit(e)} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/40 space-y-3 shadow-lg animate-in fade-in">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex justify-between items-center">
            <span>Add Credit / Payable Entry</span>
            <span className="text-[10px] text-slate-400">Idempotent Protected</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Type*</label>
              <select
                value={recordKind}
                onChange={(e) => setRecordKind(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="receivable">Receivable (Lene Hai - Get Money)</option>
                <option value="payable">Payable (Dene Hai - Pay Money)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Target Account*</label>
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
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Name (Customer / Vendor)*</label>
              <input
                type="text"
                required
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Amount (₹)*</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Due Date (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
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
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-600 transition"
            >
              Save Payment Entry
            </button>
          </div>
        </form>
      )}

      {/* Duplicate Warning Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-amber-500/50 rounded-3xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Duplicate Transaction Alert</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {duplicateWarning.message}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="py-2 px-3.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel Entry
              </button>
              <button
                type="button"
                onClick={() => handleRecordSubmit(null as any, true)}
                className="py-2 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-600"
              >
                Force Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner Confirmation Modal for Marking Paid */}
      {pendingConfirmationItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-emerald-500/50 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-black text-sm">
              <ShieldCheck className="w-6 h-6 shrink-0" />
              <span>Owner Payment Confirmation</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div>Confirm settlement for: <span className="font-bold text-slate-900 dark:text-slate-100">{pendingConfirmationItem.name}</span></div>
              <div>Amount: <span className="font-black text-emerald-600 dark:text-emerald-400">₹{pendingConfirmationItem.amount.toLocaleString('en-IN')}</span></div>
              <div className="text-[10px] text-slate-400 pt-1">Only the owner can confirm and complete payment transactions.</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingConfirmationItem(null)}
                className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExecutePayment}
                className="py-2 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition"
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Lists: Receivables & Payables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Receivables (Lene Hai) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4" />
              <span>Receivables (Lene Hai)</span>
            </h3>
            <span className="text-xs font-black text-amber-600 dark:text-amber-400">₹{totalReceivables.toLocaleString('en-IN')}</span>
          </div>

          {receivables.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No uncollected customer credit</div>
          ) : (
            <div className="space-y-2">
              {receivables.map((r) => {
                const bizName = BUSINESSES[r.businessId]?.name;
                const isPaid = r.status === 'paid';
                return (
                  <div
                    key={r.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition ${
                      isPaid ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{r.customerName}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{bizName}</span>
                        {r.dueDate && <span>• Due: {r.dueDate}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        ₹{(r.amount - r.paidAmount).toLocaleString('en-IN')}
                      </span>

                      {!isPaid && (
                        <>
                          <button
                            onClick={() => sendReminder(r.customerName, r.contact, r.amount - r.paidAmount, 'receivable')}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() =>
                              setPendingConfirmationItem({
                                id: r.id,
                                type: 'receivable',
                                name: r.customerName,
                                amount: r.amount - r.paidAmount
                              })
                            }
                            className="py-1 px-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20 hover:bg-amber-500/20"
                          >
                            Collect
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payables (Dene Hai) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" />
              <span>Payables (Dene Hai)</span>
            </h3>
            <span className="text-xs font-black text-purple-600 dark:text-purple-400">₹{totalPayables.toLocaleString('en-IN')}</span>
          </div>

          {payables.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No pending payables</div>
          ) : (
            <div className="space-y-2">
              {payables.map((p) => {
                const bizName = BUSINESSES[p.businessId]?.name;
                const isPaid = p.status === 'paid';
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition ${
                      isPaid ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{p.supplierName}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{bizName}</span>
                        {p.dueDate && <span>• Due: {p.dueDate}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                        ₹{(p.amount - p.paidAmount).toLocaleString('en-IN')}
                      </span>

                      {!isPaid && (
                        <button
                          onClick={() =>
                            setPendingConfirmationItem({
                              id: p.id,
                              type: 'payable',
                              name: p.supplierName,
                              amount: p.amount - p.paidAmount
                            })
                          }
                          className="py-1 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 hover:bg-emerald-500/20"
                        >
                          Settle
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
