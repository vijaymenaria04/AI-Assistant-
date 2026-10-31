import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Phone,
  CreditCard,
  CheckCircle2,
  Search,
  Building2,
  Sparkles,
  Send,
  FileText,
  MessageSquare,
  AlertTriangle,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  X,
  PhoneCall
} from 'lucide-react';
import { db } from '../services/db';
import { BusinessId, BUSINESSES, Supplier, SupplierPayment, Purchase } from '../types/database';
import { androidAutomation } from '../services/androidAutomation';
import { aiAgent } from '../services/aiAgent';
import { useTranslation } from '../services/i18n';

interface SuppliersViewProps {
  currentBusinessId: BusinessId;
}

type StatusFilter = 'all' | 'pending' | 'settled';

export const SuppliersView: React.FC<SuppliersViewProps> = ({ currentBusinessId }) => {
  const { t } = useTranslation();
  const [selectedBusinessId, setSelectedBusinessId] = useState<BusinessId | 'all'>(currentBusinessId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  // Forms & Modals
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPayModal, setShowPayModal] = useState<Supplier | null>(null);
  const [statementSupplier, setStatementSupplier] = useState<Supplier | null>(null);

  // Form states
  const [targetBusinessId, setTargetBusinessId] = useState<BusinessId>(
    currentBusinessId === 'personal' ? 'jain-sweets' : currentBusinessId
  );
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');

  // Payment Form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'upi' | 'bank' | 'cheque'>('upi');
  const [payNotes, setPayNotes] = useState('');

  // AI voice/text bar
  const [aiCommandText, setAiCommandText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  const loadData = async () => {
    const supList = await db.getSuppliers(selectedBusinessId === 'all' ? undefined : selectedBusinessId);
    const payList = await db.getSupplierPayments(selectedBusinessId === 'all' ? undefined : selectedBusinessId);
    const purList = await db.getPurchases(selectedBusinessId === 'all' ? undefined : selectedBusinessId);
    setSuppliers(supList);
    setPayments(payList);
    setPurchases(purList);
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

  // Add Supplier submit
  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await db.addSupplier({
      businessId: targetBusinessId,
      name: name.trim(),
      contact: contact.trim()
    });

    setName('');
    setContact('');
    setShowAddForm(false);
  };

  // Pay Supplier Submit
  const handlePaySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    await db.paySupplier(
      showPayModal.id,
      amt,
      payMethod,
      payNotes.trim() || `Payment to ${showPayModal.name}`
    );

    setShowPayModal(null);
    setPayAmount('');
    setPayNotes('');
  };

  // AI Command processing for suppliers
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

  // Send Payment Reminder via WhatsApp / Phone
  const sendPaymentReminder = (sup: Supplier) => {
    const text = `Namaste ${sup.name}, this is a reminder from ${BUSINESSES[sup.businessId]?.name || 'GopalAI Assistant'}. Your pending payable amount is ₹${sup.totalPayable.toLocaleString('en-IN')}. Please share bank details or UPI for payment. Thank you!`;
    const cleanPhone = sup.contact.replace(/[^\d]/g, '');
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    } else {
      androidAutomation.initiatePhoneCall(sup.contact || sup.name);
    }
  };

  // Filter suppliers list
  const filteredSuppliers = suppliers.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchContact = s.contact.toLowerCase().includes(q);
      const matchBiz = s.businessId.toLowerCase().includes(q);
      if (!matchName && !matchContact && !matchBiz) return false;
    }

    if (statusFilter === 'pending' && s.totalPayable <= 0) return false;
    if (statusFilter === 'settled' && s.totalPayable > 0) return false;

    return true;
  });

  const totalOutstandingPayable = suppliers.reduce((sum, s) => sum + s.totalPayable, 0);

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto pb-28">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-orange-600 dark:text-orange-400">
            Supplier Accounts & Vendor Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage suppliers, purchase history, vendor payments, and account statements
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="py-2 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Supplier</span>
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
                  ? 'bg-orange-500 text-slate-950 shadow'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : biz.color}`} />
              <span>{biz.name}</span>
            </button>
          );
        })}
      </div>

      {/* AI Voice & Text Command Bar */}
      <form onSubmit={handleExecuteAICommand} className="relative">
        <div className="p-1 rounded-2xl bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-yellow-500/20 dark:from-orange-500/30 dark:to-amber-500/30 border border-orange-500/30 shadow-md">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-3 py-2">
            <Sparkles className="w-5 h-5 text-orange-500 animate-pulse shrink-0" />
            <input
              type="text"
              value={aiCommandText}
              onChange={(e) => setAiCommandText(e.target.value)}
              placeholder="Voice/Text Command (e.g. Add Ramesh Dairy for Jain Sweets, Pay Ramesh 5000 UPI...)"
              className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isProcessingAI}
              className="py-1.5 px-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
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

      {/* Summary Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-orange-500/30 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Outstanding Vendor Dues</div>
          <div className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-0.5">
            ₹{totalOutstandingPayable.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
          <div className="font-bold text-slate-800 dark:text-slate-200">{filteredSuppliers.length} suppliers</div>
          <div className="text-[11px]">{suppliers.filter(s => s.totalPayable > 0).length} with pending dues</div>
        </div>
      </div>

      {/* Add Supplier Form Modal */}
      {showAddForm && (
        <form onSubmit={handleAddSupplier} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-orange-500/40 space-y-3 shadow-lg animate-in fade-in">
          <div className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            Add New Supplier Account
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
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Supplier / Firm Name*</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Dairy & Sweets"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Phone Contact Number</label>
              <input
                type="tel"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. 9876543210"
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
              className="py-2 px-4 rounded-xl bg-orange-500 text-slate-950 font-bold text-xs hover:bg-orange-600 transition"
            >
              Save Supplier
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search supplier by name or phone..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          {(['all', 'pending', 'settled'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-lg font-bold capitalize transition ${
                statusFilter === f
                  ? 'bg-orange-500 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending Dues' : 'Fully Settled'}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier List */}
      <div className="space-y-3">
        {filteredSuppliers.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-2 shadow-sm">
            <Users className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-300">No supplier records available</div>
            <p className="text-xs text-slate-500">
              Add vendor accounts or record purchases using GopalAI voice command to create supplier ledgers.
            </p>
          </div>
        ) : (
          filteredSuppliers.map((sup) => {
            const bizInfo = BUSINESSES[sup.businessId];
            return (
              <div
                key={sup.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{sup.name}</span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {bizInfo?.name}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                    {sup.contact && (
                      <button
                        onClick={() => androidAutomation.initiatePhoneCall(sup.contact)}
                        className="text-blue-500 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{sup.contact}</span>
                      </button>
                    )}
                    <span>Purchases: ₹{sup.totalPurchases.toLocaleString('en-IN')}</span>
                    <span>Paid: ₹{sup.totalPaid.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className="text-right mr-2">
                    <div className="text-[10px] text-slate-400">Outstanding Due</div>
                    <div className="text-sm font-black text-orange-600 dark:text-orange-400">
                      ₹{sup.totalPayable.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <button
                    onClick={() => setStatementSupplier(sup)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title="View Supplier Statement"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  {sup.contact && sup.totalPayable > 0 && (
                    <button
                      onClick={() => sendPaymentReminder(sup)}
                      className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition"
                      title="Send WhatsApp Payment Reminder"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => setShowPayModal(sup)}
                    className="py-1.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-bold transition shadow-xs"
                  >
                    Pay Supplier
                  </button>

                  <button
                    onClick={() => db.deleteSupplier(sup.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                    title="Delete Supplier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pay Supplier Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handlePaySupplier} className="w-full max-w-sm bg-white dark:bg-slate-900 border border-orange-500/40 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-extrabold text-orange-600 dark:text-orange-400 text-sm">
                Pay Supplier: {showPayModal.name}
              </h3>
              <button type="button" onClick={() => setShowPayModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Outstanding Dues: <span className="font-extrabold text-orange-600 dark:text-orange-400">₹{showPayModal.totalPayable.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Payment Amount (₹)*</label>
              <input
                type="number"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Payment Method*</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Notes / Voucher Reference</label>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. Payment for raw milk batch"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPayModal(null)}
                className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-orange-500 text-slate-950 font-bold text-xs hover:bg-orange-600 transition"
              >
                Confirm & Record Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Supplier Statement Modal */}
      {statementSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-base">
                  Supplier Statement
                </h3>
                <p className="text-xs text-slate-500">{statementSupplier.name} ({BUSINESSES[statementSupplier.businessId]?.name})</p>
              </div>
              <button type="button" onClick={() => setStatementSupplier(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl text-center text-xs">
              <div>
                <div className="text-[10px] text-slate-400">Total Purchases</div>
                <div className="font-extrabold text-slate-900 dark:text-slate-100">₹{statementSupplier.totalPurchases.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Total Paid</div>
                <div className="font-extrabold text-emerald-600 dark:text-emerald-400">₹{statementSupplier.totalPaid.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Net Due</div>
                <div className="font-black text-orange-600 dark:text-orange-400">₹{statementSupplier.totalPayable.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Payments List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment History Logs</h4>
              {payments.filter(p => p.supplierId === statementSupplier.id).length === 0 ? (
                <div className="text-xs text-slate-400 italic">No payments recorded for this supplier.</div>
              ) : (
                payments.filter(p => p.supplierId === statementSupplier.id).map(p => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{p.notes || 'Supplier Payment'}</div>
                      <div className="text-[10px] text-slate-400">{p.date} • {p.paymentMethod.toUpperCase()}</div>
                    </div>
                    <div className="font-extrabold text-emerald-600 dark:text-emerald-400">-₹{p.amount.toLocaleString('en-IN')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
