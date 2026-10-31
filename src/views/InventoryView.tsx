import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Plus,
  AlertTriangle,
  Search,
  Edit2,
  Trash2,
  History,
  TrendingDown,
  RefreshCw,
  Building2,
  Calendar,
  Truck,
  CheckCircle2,
  AlertCircle,
  X,
  PackageCheck,
  ShoppingBag
} from 'lucide-react';
import { db } from '../services/db';
import { BusinessId, BUSINESSES, InventoryItem, StockMovement } from '../types/database';
import { useTranslation } from '../services/i18n';

interface InventoryViewProps {
  currentBusinessId: BusinessId;
}

type SubSection = 'stock_list' | 'movement_history' | 'reorder_suggestions';

export const InventoryView: React.FC<InventoryViewProps> = ({ currentBusinessId }) => {
  const { t } = useTranslation();
  const [selectedBusinessId, setSelectedBusinessId] = useState<BusinessId | 'all'>(currentBusinessId);
  const [activeSection, setActiveSection] = useState<SubSection>('stock_list');

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states (Add / Edit)
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [targetBusinessId, setTargetBusinessId] = useState<BusinessId>(
    currentBusinessId === 'personal' ? 'jain-sweets' : currentBusinessId
  );
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Raw Materials');
  const [stockQuantity, setStockQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [minStockLevel, setMinStockLevel] = useState('10');
  const [supplierName, setSupplierName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Wastage modal state
  const [wastageItem, setWastageItem] = useState<InventoryItem | null>(null);
  const [wastageQty, setWastageQty] = useState('');
  const [wastageNotes, setWastageNotes] = useState('');

  const loadInventory = async () => {
    const list = await db.getInventory(selectedBusinessId === 'all' ? undefined : selectedBusinessId);
    const m = await db.getStockMovements(selectedBusinessId === 'all' ? undefined : selectedBusinessId);
    setItems(list);
    setMovements(m);
  };

  useEffect(() => {
    setSelectedBusinessId(currentBusinessId);
    if (currentBusinessId !== 'personal') {
      setTargetBusinessId(currentBusinessId);
    }
  }, [currentBusinessId]);

  useEffect(() => {
    loadInventory();
    const unsub = db.subscribe(loadInventory);
    return unsub;
  }, [selectedBusinessId]);

  // Handle Add Item Submit
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(stockQuantity);
    const minLvl = parseFloat(minStockLevel) || 5;

    if (!name.trim() || isNaN(qty)) return;

    if (editingItem) {
      await db.updateInventoryItem(editingItem.id, {
        name: name.trim(),
        category,
        stockQuantity: qty,
        unit,
        minStockLevel: minLvl,
        expiryDate: expiryDate || undefined
      });
      setEditingItem(null);
    } else {
      await db.addInventoryItem({
        businessId: targetBusinessId,
        name: name.trim(),
        category,
        stockQuantity: qty,
        unit,
        minStockLevel: minLvl,
        expiryDate: expiryDate || undefined
      });
    }

    // Reset Form
    setName('');
    setStockQuantity('');
    setMinStockLevel('10');
    setSupplierName('');
    setExpiryDate('');
    setShowAddForm(false);
  };

  // Populate Edit Form
  const startEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setTargetBusinessId(item.businessId);
    setName(item.name);
    setCategory(item.category || 'Raw Materials');
    setStockQuantity(item.stockQuantity.toString());
    setUnit(item.unit || 'kg');
    setMinStockLevel(item.minStockLevel.toString());
    setExpiryDate(item.expiryDate || '');
    setShowAddForm(true);
  };

  // Quick Qty change (+ / -)
  const handleUpdateQty = async (id: string, current: number, change: number) => {
    const newQty = Math.max(0, current + change);
    await db.updateInventoryQuantity(id, newQty);
  };

  // Submit Wastage
  const handleRecordWastageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wastageItem) return;
    const qty = parseFloat(wastageQty);
    if (isNaN(qty) || qty <= 0) return;

    await db.recordWastage(wastageItem.id, qty, wastageNotes.trim() || undefined);

    setWastageItem(null);
    setWastageQty('');
    setWastageNotes('');
  };

  // Filter Items
  const filteredItems = items.filter((i) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q) ||
      i.businessId.toLowerCase().includes(q)
    );
  });

  const lowStockItems = items.filter((i) => i.stockQuantity <= i.minStockLevel);

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto pb-28">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {t('inventoryStockTitle')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Stock levels, wastage tracking, low-stock alerts & reorder suggestions
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setName('');
            setStockQuantity('');
            setShowAddForm(!showAddForm);
          }}
          className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{t('addStockItemBtn')}</span>
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
          { id: 'all', name: 'All Stock', color: 'text-indigo-500' }
        ].map((biz) => {
          const isActive = selectedBusinessId === biz.id;
          return (
            <button
              key={biz.id}
              onClick={() => setSelectedBusinessId(biz.id as any)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${isActive ? 'text-white' : biz.color}`} />
              <span>{biz.name}</span>
            </button>
          );
        })}
      </div>

      {/* Low Stock Dynamic Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-800 dark:text-amber-300 text-xs shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <div className="font-extrabold text-sm">{t('reorderAlert')} ({lowStockItems.length} items critical)</div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {lowStockItems.map((i) => (
                <span key={i.id} className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-900 dark:text-amber-200 font-bold text-[11px] border border-amber-500/30">
                  {i.name}: {i.stockQuantity} {i.unit} (Min: {i.minStockLevel})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
        {[
          { id: 'stock_list', label: `Stock Items (${filteredItems.length})`, icon: Boxes },
          { id: 'movement_history', label: `Movement History (${movements.length})`, icon: History },
          { id: 'reorder_suggestions', label: `Reorder Suggestions (${lowStockItems.length})`, icon: RefreshCw }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as SubSection)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Add / Edit Form Modal */}
      {showAddForm && (
        <form onSubmit={handleAddItem} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/40 space-y-3 shadow-lg animate-in fade-in">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>{editingItem ? 'Edit Stock Item' : t('addInventoryRecord')}</span>
            {editingItem && (
              <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
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
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('itemName')}*</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sugar / Paneer / Tea leaves"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('currentStockQty')}*</label>
              <input
                type="number"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="e.g. 50"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('unit')}*</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="kg">kg</option>
                <option value="liters">liters</option>
                <option value="pcs">pcs</option>
                <option value="packets">packets</option>
                <option value="boxes">boxes</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('reorderLevelAlert')}*</label>
              <input
                type="number"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(e.target.value)}
                placeholder="e.g. 10"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">{t('expiryDateOptional')}</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
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
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              {editingItem ? 'Update Item' : t('saveStockItem')}
            </button>
          </div>
        </form>
      )}

      {/* SECTION 1: STOCK LIST */}
      {activeSection === 'stock_list' && (
        <div className="space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stock by item name, category, or business..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-2 shadow-sm">
              <Boxes className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-300">
                {t('noInventoryAdded')}
              </div>
              <p className="text-xs text-slate-500">
                No items registered for this business. Click "{t('addStockItemBtn')}" above to start tracking inventory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredItems.map((item) => {
                const isLow = item.stockQuantity <= item.minStockLevel;
                const bizInfo = BUSINESSES[item.businessId];
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition shadow-sm space-y-3 ${
                      isLow ? 'border-amber-500/50 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.name}</span>
                          {isLow && (
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              {t('lowStockTag')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{bizInfo?.name}</span>
                          <span>•</span>
                          <span>Category: {item.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition"
                          title="Edit Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => db.deleteInventoryItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                          title="Delete Stock Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400">Min Alert Threshold</div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {item.minStockLevel} {item.unit}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {item.stockQuantity} <span className="text-xs text-slate-500 font-normal">{item.unit}</span>
                          </div>
                        </div>

                        {/* Quick Stock Controls */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                          <button
                            onClick={() => handleUpdateQty(item.id, item.stockQuantity, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 text-xs flex items-center justify-center"
                            title="Decrease Stock"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleUpdateQty(item.id, item.stockQuantity, 1)}
                            className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500/30 text-xs flex items-center justify-center"
                            title="Increase Stock"
                          >
                            +
                          </button>
                          <button
                            onClick={() => setWastageItem(item)}
                            className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-500/20 text-[10px] flex items-center justify-center"
                            title="Report Wastage/Spoilage"
                          >
                            W
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: STOCK MOVEMENT HISTORY */}
      {activeSection === 'movement_history' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500">
            Real-time audit log of stock additions, sales consumption, wastage, and manual adjustments.
          </div>
          {movements.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
              <History className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">No stock movement logs yet</div>
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div key={m.id} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                        m.type === 'purchase'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : m.type === 'sale' || m.type === 'consumption'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : m.type === 'wastage'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {m.type}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{m.itemName}</div>
                      <div className="text-[10px] text-slate-400">
                        {BUSINESSES[m.businessId]?.name} • {new Date(m.createdAt).toLocaleString()} {m.notes ? `• ${m.notes}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="font-extrabold text-slate-900 dark:text-slate-100">
                    {m.type === 'purchase' || m.type === 'adjustment' ? '+' : '-'}{m.quantity} {m.unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: REORDER SUGGESTIONS */}
      {activeSection === 'reorder_suggestions' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500">
            Automated calculations based on current stock levels vs minimum reorder thresholds.
          </div>
          {lowStockItems.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <PackageCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">All Stock Levels Optimal!</div>
              <p className="text-xs text-slate-500">No reorder needed currently for the selected workspace.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lowStockItems.map((item) => {
                const suggestedOrderQty = Math.max(10, item.minStockLevel * 2 - item.stockQuantity);
                return (
                  <div key={item.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/40 space-y-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.name}</h4>
                        <div className="text-[11px] text-slate-500">{BUSINESSES[item.businessId]?.name}</div>
                      </div>
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                        Low Stock
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Current Stock</span>
                        <span className="font-extrabold text-amber-600 dark:text-amber-400">
                          {item.stockQuantity} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Suggested Reorder</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          +{suggestedOrderQty} {item.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Wastage Modal */}
      {wastageItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form onSubmit={handleRecordWastageSubmit} className="bg-white dark:bg-slate-900 border border-rose-500/40 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Record Spoilage / Wastage
              </h3>
              <button type="button" onClick={() => setWastageItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Item: <span className="font-bold text-slate-900 dark:text-slate-100">{wastageItem.name}</span> (Current: {wastageItem.stockQuantity} {wastageItem.unit})
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Wasted Quantity ({wastageItem.unit})*</label>
              <input
                type="number"
                required
                value={wastageQty}
                onChange={(e) => setWastageQty(e.target.value)}
                placeholder="e.g. 2"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Reason / Notes</label>
              <input
                type="text"
                value={wastageNotes}
                onChange={(e) => setWastageNotes(e.target.value)}
                placeholder="e.g. Expired, damaged in transit"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWastageItem(null)}
                className="py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-1.5 px-4 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition"
              >
                Deduct Wastage
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
