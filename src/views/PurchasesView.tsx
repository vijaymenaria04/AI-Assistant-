import React, { useEffect, useState } from 'react';
import { Truck, Plus, Boxes, Building2, Search } from 'lucide-react';
import { db } from '../services/db';
import { BusinessId, BUSINESSES, Purchase } from '../types/database';
import { useTranslation } from '../services/i18n';

interface PurchasesViewProps {
  currentBusinessId: BusinessId;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ currentBusinessId }) => {
  const { t } = useTranslation();
  const [selectedBusinessId, setSelectedBusinessId] = useState<BusinessId | 'all'>(currentBusinessId);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [targetBusinessId, setTargetBusinessId] = useState<BusinessId>(
    currentBusinessId === 'personal' ? 'jain-sweets' : currentBusinessId
  );
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [amount, setAmount] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadPurchases = async () => {
    const list = await db.getPurchases(selectedBusinessId === 'all' ? undefined : selectedBusinessId);
    setPurchases(list);
  };

  useEffect(() => {
    setSelectedBusinessId(currentBusinessId);
    if (currentBusinessId !== 'personal') {
      setTargetBusinessId(currentBusinessId);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    loadPurchases();
    const unsub = db.subscribe(loadPurchases);
    return unsub;
  }, [selectedBusinessId]);

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const totAmount = parseFloat(amount);
    const qty = parseFloat(quantity);
    if (!itemName || isNaN(totAmount) || isNaN(qty)) return;

    const paid = paidAmount ? parseFloat(paidAmount) : totAmount;

    await db.addPurchase({
      businessId: targetBusinessId,
      itemName: itemName.trim(),
      quantity: qty,
      unit,
      amount: totAmount,
      supplierName: supplierName.trim() || 'General Vendor',
      date: new Date().toISOString().split('T')[0],
      paidAmount: paid
    });

    setItemName('');
    setQuantity('');
    setAmount('');
    setSupplierName('');
    setPaidAmount('');
    setShowAddForm(false);
  };

  const filteredPurchases = purchases.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.itemName.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q) ||
      p.businessId.toLowerCase().includes(q)
    );
  });

  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto pb-28">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{t('stockPurchasesInward')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Record inward goods purchased from vendors and suppliers</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="py-2 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{t('recordPurchaseBtn')}</span>
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
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-white' : biz.color}`} />
              <span>{biz.name}</span>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
        <div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('totalPurchaseAmount')}</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">₹{totalPurchases.toLocaleString('en-IN')}</div>
        </div>
        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
          <div className="font-bold text-slate-800 dark:text-slate-200">{filteredPurchases.length} inward records</div>
        </div>
      </div>

      {/* Form */}
      {showAddForm && (
        <form onSubmit={handleAddPurchase} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-500/40 space-y-3 shadow-lg animate-in fade-in">
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {t('recordStockPurchase')}
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
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('itemName')}*</label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Sugar / Milk / Flour"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('quantity')}*</label>
              <input
                type="number"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 50"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('unit')}</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="kg">kg (Kilograms)</option>
                <option value="liters">liters</option>
                <option value="pcs">pcs (Pieces)</option>
                <option value="packets">packets</option>
                <option value="boxes">boxes</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Total Bill Amount (₹)*</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 2200"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('supplierName')}</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Ramesh Traders"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('paidAmountRupees')}</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="Leave empty if fully paid"
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
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xs hover:brightness-110"
            >
              {t('savePurchaseStock')}
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search purchases by item or supplier..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredPurchases.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-2 shadow-sm">
            <Truck className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-300">{t('noPurchasesYet')}</div>
            <p className="text-xs text-slate-500">Record inventory purchases to automatically update stock.</p>
          </div>
        ) : (
          filteredPurchases.map((p) => {
            const bizInfo = BUSINESSES[p.businessId];
            return (
              <div key={p.id} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{p.itemName}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {p.quantity} {p.unit}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {bizInfo?.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Supplier: {p.supplierName} • Date: {p.date}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400">₹{p.amount.toLocaleString('en-IN')}</div>
                  {p.pendingAmount > 0 && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Due: ₹{p.pendingAmount.toLocaleString('en-IN')}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
