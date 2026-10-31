import {
  BusinessId,
  PersonalTransaction,
  PersonalContact,
  Sale,
  Expense,
  Purchase,
  InventoryItem,
  StockMovement,
  Supplier,
  SupplierPayment,
  Receivable,
  Payable,
  Staff,
  StaffTransfer,
  ManpowerPlan,
  CateringEvent,
  CateringOrder,
  StaffAdvance,
  Attendance,
  SalaryRecord,
  Task,
  Reminder,
  Note,
  NotificationItem,
  ReportRecord,
  AICommandHistory,
  BackgroundJob,
  SyncQueueItem,
  AppSettings
} from '../types/database';

const DB_NAME = 'GopalAI_Assistant_DB';
const DB_VERSION = 5;

type EventCallback = () => void;

class DatabaseService {
  private db: IDBDatabase | null = null;
  private listeners: Set<EventCallback> = new Set();

  public async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;

        // Stores
        if (!db.objectStoreNames.contains('personal_transactions')) {
          db.createObjectStore('personal_transactions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('personal_contacts')) {
          db.createObjectStore('personal_contacts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sales')) {
          db.createObjectStore('sales', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('expenses')) {
          db.createObjectStore('expenses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('purchases')) {
          db.createObjectStore('purchases', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('inventory_items')) {
          db.createObjectStore('inventory_items', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('stock_movements')) {
          db.createObjectStore('stock_movements', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('suppliers')) {
          db.createObjectStore('suppliers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('supplier_payments')) {
          db.createObjectStore('supplier_payments', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('receivables')) {
          db.createObjectStore('receivables', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('payables')) {
          db.createObjectStore('payables', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('staff')) {
          db.createObjectStore('staff', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('staff_transfers')) {
          db.createObjectStore('staff_transfers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('manpower_plans')) {
          db.createObjectStore('manpower_plans', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('catering_events')) {
          db.createObjectStore('catering_events', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('catering_orders')) {
          db.createObjectStore('catering_orders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('staff_advances')) {
          db.createObjectStore('staff_advances', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('attendance')) {
          db.createObjectStore('attendance', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('salaries')) {
          db.createObjectStore('salaries', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('reminders')) {
          db.createObjectStore('reminders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('reports')) {
          db.createObjectStore('reports', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('ai_command_history')) {
          db.createObjectStore('ai_command_history', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('background_jobs')) {
          db.createObjectStore('background_jobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('app_settings')) {
          db.createObjectStore('app_settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        this.ensureDefaultSettings().then(() => resolve());
      };

      request.onerror = (e) => {
        console.error('IndexedDB error:', e);
        reject(e);
      };
    });
  }

  public subscribe(cb: EventCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  // --- App Settings ---
  public async getSettings(): Promise<AppSettings> {
    const settings = await this.getItem<string, AppSettings & { key: string }>('app_settings', 'config');
    return settings || {
      theme: 'dark',
      language: 'hinglish',
      pinEnabled: true,
      pinHash: '1234',
      voiceGender: 'female',
      voiceSpeed: 1,
      ttsEnabled: true,
      cloudSyncEnabled: true,
      backgroundTasksEnabled: true,
      ownerName: 'Gopal'
    };
  }

  public async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings, key: 'config' };
    await this.setItem('app_settings', updated);
    this.notify();
  }

  private async ensureDefaultSettings() {
    const current = await this.getItem('app_settings', 'config');
    if (!current) {
      await this.setItem('app_settings', {
        key: 'config',
        theme: 'dark',
        language: 'hinglish',
        pinEnabled: true,
        pinHash: '1234',
        voiceGender: 'female',
        voiceSpeed: 1,
        ttsEnabled: true,
        cloudSyncEnabled: true,
        backgroundTasksEnabled: true,
        ownerName: 'Gopal'
      });
    }
  }

  // --- Helper Methods ---
  private async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init();
    if (!this.db || !this.db.objectStoreNames.contains(storeName)) {
      console.warn(`Object store "${storeName}" not found in IndexedDB.`);
      return [];
    }
    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (err) => {
          console.warn(`Error reading store "${storeName}":`, err);
          resolve([]);
        };
      } catch (err) {
        console.warn(`Failed transaction for store "${storeName}":`, err);
        resolve([]);
      }
    });
  }

  private async getItem<K, T>(storeName: string, key: K): Promise<T | null> {
    if (!this.db) await this.init();
    if (!this.db || !this.db.objectStoreNames.contains(storeName)) {
      console.warn(`Object store "${storeName}" not found in IndexedDB.`);
      return null;
    }
    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key as any);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = (err) => {
          console.warn(`Error reading item from "${storeName}":`, err);
          resolve(null);
        };
      } catch (err) {
        console.warn(`Failed transaction for store "${storeName}":`, err);
        resolve(null);
      }
    });
  }

  private async setItem<T extends { id?: string; key?: string }>(storeName: string, item: T): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db || !this.db.objectStoreNames.contains(storeName)) {
      console.warn(`Object store "${storeName}" not found in IndexedDB.`);
      return;
    }
    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = (err) => {
          console.warn(`Error writing to store "${storeName}":`, err);
          resolve();
        };
      } catch (err) {
        console.warn(`Failed put transaction for store "${storeName}":`, err);
        resolve();
      }
    });
  }

  private async deleteItem(storeName: string, id: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db || !this.db.objectStoreNames.contains(storeName)) {
      console.warn(`Object store "${storeName}" not found in IndexedDB.`);
      return;
    }
    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = (err) => {
          console.warn(`Error deleting from store "${storeName}":`, err);
          resolve();
        };
      } catch (err) {
        console.warn(`Failed delete transaction for store "${storeName}":`, err);
        resolve();
      }
    });
  }

  // --- Sales ---
  public async getSales(businessId?: BusinessId): Promise<Sale[]> {
    const all = await this.getAll<Sale>('sales');
    if (!businessId || businessId === 'personal') return all;
    return all.filter((s) => s.businessId === businessId);
  }

  public async addSale(sale: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
    const newSale: Sale = {
      ...sale,
      id: 'sale_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('sales', newSale);

    // Record stock movements for sold items if inventory matches
    for (const item of sale.items) {
      await this.recordStockMovement({
        businessId: sale.businessId,
        itemName: item.itemName,
        type: 'sale',
        quantity: item.quantity,
        unit: item.unit,
        notes: `Sale #${newSale.id}`
      });
    }

    // Queue cloud sync
    await this.addToSyncQueue('ADD_SALE', newSale);
    this.notify();
    return newSale;
  }

  public async deleteSale(id: string): Promise<void> {
    await this.deleteItem('sales', id);
    this.notify();
  }

  // --- Expenses ---
  public async getExpenses(businessId?: BusinessId): Promise<Expense[]> {
    const all = await this.getAll<Expense>('expenses');
    if (!businessId) return all;
    return all.filter((e) => e.businessId === businessId);
  }

  public async addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const newExpense: Expense = {
      ...expense,
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('expenses', newExpense);
    await this.addToSyncQueue('ADD_EXPENSE', newExpense);
    this.notify();
    return newExpense;
  }

  // --- Purchases ---
  public async getPurchases(businessId?: BusinessId): Promise<Purchase[]> {
    const all = await this.getAll<Purchase>('purchases');
    if (!businessId || businessId === 'personal') return all;
    return all.filter((p) => p.businessId === businessId);
  }

  public async addPurchase(purchase: Omit<Purchase, 'id' | 'createdAt' | 'pendingAmount' | 'paymentStatus'>): Promise<Purchase> {
    const pendingAmount = Math.max(0, purchase.amount - purchase.paidAmount);
    const paymentStatus: 'paid' | 'partial' | 'pending' =
      pendingAmount === 0 ? 'paid' : purchase.paidAmount > 0 ? 'partial' : 'pending';

    const newPurchase: Purchase = {
      ...purchase,
      pendingAmount,
      paymentStatus,
      id: 'pur_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('purchases', newPurchase);

    // Update or add inventory
    const inventory = await this.getInventory(purchase.businessId);
    const existing = inventory.find((i) => i.name.toLowerCase() === purchase.itemName.toLowerCase());
    if (existing) {
      existing.stockQuantity += purchase.quantity;
      existing.lastUpdated = new Date().toISOString();
      await this.setItem('inventory_items', existing);
    } else {
      await this.setItem('inventory_items', {
        id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        businessId: purchase.businessId,
        name: purchase.itemName,
        category: 'Raw Materials',
        stockQuantity: purchase.quantity,
        unit: purchase.unit,
        minStockLevel: 10,
        lastUpdated: new Date().toISOString()
      } as InventoryItem);
    }

    // Record stock movement
    await this.recordStockMovement({
      businessId: purchase.businessId,
      itemName: purchase.itemName,
      type: 'purchase',
      quantity: purchase.quantity,
      unit: purchase.unit,
      notes: `Purchase from ${purchase.supplierName}`
    });

    // Handle Supplier ledger
    if (purchase.supplierName) {
      await this.updateSupplierPurchase(purchase.businessId, purchase.supplierName, purchase.amount, purchase.paidAmount);
    }

    await this.addToSyncQueue('ADD_PURCHASE', newPurchase);
    this.notify();
    return newPurchase;
  }

  // --- Inventory ---
  public async getInventory(businessId?: BusinessId): Promise<InventoryItem[]> {
    const all = await this.getAll<InventoryItem>('inventory_items');
    if (!businessId || businessId === 'personal') return all;
    return all.filter((i) => i.businessId === businessId);
  }

  public async addInventoryItem(item: Omit<InventoryItem, 'id' | 'lastUpdated'>): Promise<InventoryItem> {
    const newItem: InventoryItem = {
      ...item,
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      lastUpdated: new Date().toISOString()
    };
    await this.setItem('inventory_items', newItem);
    this.notify();
    return newItem;
  }

  public async updateInventoryQuantity(id: string, newQty: number): Promise<void> {
    const item = await this.getItem<string, InventoryItem>('inventory_items', id);
    if (item) {
      const diff = newQty - item.stockQuantity;
      item.stockQuantity = newQty;
      item.lastUpdated = new Date().toISOString();
      await this.setItem('inventory_items', item);

      await this.recordStockMovement({
        businessId: item.businessId,
        inventoryItemId: item.id,
        itemName: item.name,
        type: diff >= 0 ? 'adjustment' : 'consumption',
        quantity: Math.abs(diff),
        unit: item.unit,
        notes: 'Manual inventory adjustment'
      });
      this.notify();
    }
  }

  public async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<void> {
    const item = await this.getItem<string, InventoryItem>('inventory_items', id);
    if (item) {
      const updated = { ...item, ...updates, lastUpdated: new Date().toISOString() };
      await this.setItem('inventory_items', updated);
      this.notify();
    }
  }

  public async deleteInventoryItem(id: string): Promise<void> {
    await this.deleteItem('inventory_items', id);
    this.notify();
  }

  public async recordWastage(id: string, qty: number, notes?: string): Promise<void> {
    const item = await this.getItem<string, InventoryItem>('inventory_items', id);
    if (item) {
      item.stockQuantity = Math.max(0, item.stockQuantity - qty);
      item.lastUpdated = new Date().toISOString();
      await this.setItem('inventory_items', item);

      await this.recordStockMovement({
        businessId: item.businessId,
        inventoryItemId: item.id,
        itemName: item.name,
        type: 'wastage',
        quantity: qty,
        unit: item.unit,
        notes: notes || 'Spoilage / Wastage recorded'
      });
      this.notify();
    }
  }

  public async recordStockMovement(m: Omit<StockMovement, 'id' | 'createdAt'>): Promise<void> {
    const movement: StockMovement = {
      ...m,
      id: 'sm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('stock_movements', movement);
  }

  public async getStockMovements(businessId?: BusinessId): Promise<StockMovement[]> {
    const all = await this.getAll<StockMovement>('stock_movements');
    if (!businessId || businessId === 'personal') return all;
    return all.filter((sm) => sm.businessId === businessId);
  }

  // --- Suppliers & Payables ---
  public async getSuppliers(businessId?: BusinessId): Promise<Supplier[]> {
    const all = await this.getAll<Supplier>('suppliers');
    if (!businessId || businessId === 'personal') return all;
    return all.filter((s) => s.businessId === businessId);
  }

  public async addSupplier(sup: Omit<Supplier, 'id' | 'createdAt' | 'totalPurchases' | 'totalPaid' | 'totalPayable'>): Promise<Supplier> {
    const newSup: Supplier = {
      ...sup,
      totalPurchases: 0,
      totalPaid: 0,
      totalPayable: 0,
      id: 'sup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('suppliers', newSup);
    this.notify();
    return newSup;
  }

  public async deleteSupplier(id: string): Promise<void> {
    await this.deleteItem('suppliers', id);
    this.notify();
  }

  private async updateSupplierPurchase(businessId: BusinessId, supplierName: string, purchaseAmount: number, paidAmount: number) {
    const suppliers = await this.getSuppliers(businessId);
    let sup = suppliers.find((s) => s.name.toLowerCase() === supplierName.toLowerCase());
    if (!sup) {
      sup = await this.addSupplier({
        businessId,
        name: supplierName,
        contact: ''
      });
    }
    sup.totalPurchases += purchaseAmount;
    sup.totalPaid += paidAmount;
    sup.totalPayable = Math.max(0, sup.totalPurchases - sup.totalPaid);
    await this.setItem('suppliers', sup);
  }

  public async paySupplier(supplierId: string, amount: number, paymentMethod: 'cash' | 'upi' | 'bank' | 'cheque', notes?: string): Promise<SupplierPayment> {
    const sup = await this.getItem<string, Supplier>('suppliers', supplierId);
    if (!sup) throw new Error('Supplier not found');

    const payment: SupplierPayment = {
      id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      supplierId,
      businessId: sup.businessId,
      amount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod,
      notes,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    await this.setItem('supplier_payments', payment);

    sup.totalPaid += amount;
    sup.totalPayable = Math.max(0, sup.totalPurchases - sup.totalPaid);
    await this.setItem('suppliers', sup);

    // Also log expense under raw materials or supplier payment
    await this.addExpense({
      businessId: sup.businessId,
      amount,
      category: 'raw_materials',
      date: payment.date,
      paymentMethod: paymentMethod === 'cheque' ? 'bank' : paymentMethod,
      notes: `Supplier Payment to ${sup.name} (${notes || ''})`
    });

    this.notify();
    return payment;
  }

  public async getSupplierPayments(businessId?: BusinessId): Promise<SupplierPayment[]> {
    const all = await this.getAll<SupplierPayment>('supplier_payments');
    if (!businessId || businessId === 'personal') return all;
    return all.filter((sp) => sp.businessId === businessId);
  }

  // --- Receivables & Customer Credit ---
  public async getReceivables(businessId?: BusinessId): Promise<Receivable[]> {
    const all = await this.getAll<Receivable>('receivables');
    if (!businessId || businessId === 'personal') return all;
    return all.filter((r) => r.businessId === businessId);
  }

  public async getPayables(businessId?: BusinessId): Promise<Payable[]> {
    const all = await this.getAll<Payable>('payables');
    if (!businessId || businessId === 'personal') return all;
    return all.filter((p) => p.businessId === businessId);
  }

  public async addReceivable(rec: Omit<Receivable, 'id' | 'createdAt' | 'paidAmount' | 'status'>): Promise<Receivable> {
    const newRec: Receivable = {
      ...rec,
      paidAmount: 0,
      status: 'unpaid',
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('receivables', newRec);
    this.notify();
    return newRec;
  }

  public async addPayable(pay: Omit<Payable, 'id' | 'createdAt' | 'paidAmount' | 'status'>): Promise<Payable> {
    const newPay: Payable = {
      ...pay,
      paidAmount: 0,
      status: 'unpaid',
      id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('payables', newPay);
    this.notify();
    return newPay;
  }

  public async markReceivablePaid(id: string): Promise<void> {
    const rec = await this.getItem<string, Receivable>('receivables', id);
    if (rec) {
      rec.paidAmount = rec.amount;
      rec.status = 'paid';
      await this.setItem('receivables', rec);
      this.notify();
    }
  }

  public async markPayablePaid(id: string): Promise<void> {
    const pay = await this.getItem<string, Payable>('payables', id);
    if (pay) {
      pay.paidAmount = pay.amount;
      pay.status = 'paid';
      await this.setItem('payables', pay);
      this.notify();
    }
  }

  // --- Staff, Attendance & Payroll ---
  public async getStaff(businessId?: BusinessId): Promise<Staff[]> {
    const all = await this.getAll<Staff>('staff');
    if (!businessId || businessId === 'personal') return all;
    return all.filter((s) => s.assignedLocation === businessId || s.businessId === businessId);
  }

  public async addStaff(member: Omit<Staff, 'id'>): Promise<Staff> {
    const newMember: Staff = {
      ...member,
      assignedLocation: member.assignedLocation || member.businessId,
      status: member.status || 'active',
      advanceBalance: member.advanceBalance || 0,
      id: 'staff_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
    };
    await this.setItem('staff', newMember);
    this.notify();
    return newMember;
  }

  public async updateStaff(id: string, updates: Partial<Staff>): Promise<void> {
    const s = await this.getItem<string, Staff>('staff', id);
    if (s) {
      const updated = { ...s, ...updates };
      await this.setItem('staff', updated);
      this.notify();
    }
  }

  public async deleteStaff(id: string): Promise<void> {
    await this.deleteItem('staff', id);
    this.notify();
  }

  public async transferStaff(staffId: string, toBusinessId: BusinessId, notes?: string): Promise<StaffTransfer> {
    const s = await this.getItem<string, Staff>('staff', staffId);
    if (!s) throw new Error('Staff member not found');

    const transferRecord: StaffTransfer = {
      id: 'trans_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      staffId,
      staffName: s.name,
      fromBusinessId: s.assignedLocation || s.businessId,
      toBusinessId,
      transferDate: new Date().toISOString().split('T')[0],
      notes,
      createdAt: new Date().toISOString()
    };

    await this.setItem('staff_transfers', transferRecord);

    // Update staff location
    s.assignedLocation = toBusinessId;
    s.businessId = toBusinessId;
    await this.setItem('staff', s);

    this.notify();
    return transferRecord;
  }

  public async getStaffTransfers(staffId?: string): Promise<StaffTransfer[]> {
    const all = await this.getAll<StaffTransfer>('staff_transfers');
    if (staffId) return all.filter((t) => t.staffId === staffId);
    return all;
  }

  // --- Manpower Plans ---
  public async getManpowerPlans(businessId?: BusinessId): Promise<ManpowerPlan[]> {
    const all = await this.getAll<ManpowerPlan>('manpower_plans');
    if (!businessId || businessId === 'personal') return all;
    return all.filter((mp) => mp.businessId === businessId);
  }

  public async saveManpowerPlan(plan: Omit<ManpowerPlan, 'id' | 'updatedAt'> & { id?: string }): Promise<ManpowerPlan> {
    const id = plan.id || 'mp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const updatedPlan: ManpowerPlan = {
      ...plan,
      id,
      updatedAt: new Date().toISOString()
    };
    await this.setItem('manpower_plans', updatedPlan);
    this.notify();
    return updatedPlan;
  }

  public async deleteManpowerPlan(id: string): Promise<void> {
    await this.deleteItem('manpower_plans', id);
    this.notify();
  }

  // --- Catering Events & Orders (Gopal Caterers) ---
  public async getCateringEvents(): Promise<CateringEvent[]> {
    return await this.getAll<CateringEvent>('catering_events');
  }

  public async addCateringEvent(evt: Omit<CateringEvent, 'id' | 'createdAt'>): Promise<CateringEvent> {
    const newEvt: CateringEvent = {
      ...evt,
      id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('catering_events', newEvt);
    this.notify();
    return newEvt;
  }

  public async deleteCateringEvent(id: string): Promise<void> {
    await this.deleteItem('catering_events', id);
    this.notify();
  }

  public async getCateringOrders(): Promise<CateringOrder[]> {
    return await this.getAll<CateringOrder>('catering_orders');
  }

  public async addCateringOrder(
    order: Omit<CateringOrder, 'id' | 'createdAt' | 'pendingAmount'>
  ): Promise<CateringOrder> {
    const pendingAmount = Math.max(0, order.totalAmount - order.advanceAmount);
    const newOrder: CateringOrder = {
      ...order,
      pendingAmount,
      id: 'cat_ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };

    await this.setItem('catering_orders', newOrder);

    // Also record sale entry under Gopal Caterers for advance received
    if (order.advanceAmount > 0) {
      await this.addSale({
        businessId: 'gopal-caterers',
        amount: order.advanceAmount,
        date: order.eventDate,
        paymentMethod: 'upi',
        customerName: order.customerName,
        items: [
          {
            id: 'item_cat_1',
            itemName: `Catering Advance - ${order.eventType.toUpperCase()} (${order.guestCount} Pax)`,
            quantity: 1,
            unit: 'event',
            price: order.advanceAmount,
            total: order.advanceAmount
          }
        ],
        notes: `Advance for ${order.venue}`
      });
    }

    // Add reminder for event date
    await this.addReminder({
      title: `Catering Event: ${order.customerName} (${order.eventType.toUpperCase()}) - ${order.guestCount} Guests`,
      dateTime: `${order.eventDate}T09:00:00`,
      businessId: 'gopal-caterers',
      priority: 'high'
    });

    this.notify();
    return newOrder;
  }

  public async updateCateringOrder(id: string, updates: Partial<CateringOrder>): Promise<void> {
    const order = await this.getItem<string, CateringOrder>('catering_orders', id);
    if (order) {
      const updated = { ...order, ...updates };
      if (updates.totalAmount !== undefined || updates.advanceAmount !== undefined) {
        updated.pendingAmount = Math.max(0, updated.totalAmount - updated.advanceAmount);
      }
      await this.setItem('catering_orders', updated);
      this.notify();
    }
  }

  public async deleteCateringOrder(id: string): Promise<void> {
    await this.deleteItem('catering_orders', id);
    this.notify();
  }

  public async assignStaffToCateringOrder(orderId: string, staffIds: string[]): Promise<void> {
    const order = await this.getItem<string, CateringOrder>('catering_orders', orderId);
    if (order) {
      order.assignedStaffIds = staffIds;
      await this.setItem('catering_orders', order);
      this.notify();
    }
  }

  // --- Advances & Deductions ---
  public async getStaffAdvances(staffId?: string): Promise<StaffAdvance[]> {
    const all = await this.getAll<StaffAdvance>('staff_advances');
    if (staffId) return all.filter((a) => a.staffId === staffId);
    return all;
  }

  public async addStaffAdvance(adv: Omit<StaffAdvance, 'id' | 'createdAt'>): Promise<StaffAdvance> {
    const newAdv: StaffAdvance = {
      ...adv,
      id: 'adv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('staff_advances', newAdv);

    // Adjust staff active advance balance
    const staff = await this.getItem<string, Staff>('staff', adv.staffId);
    if (staff) {
      const currentAdv = staff.advanceBalance || 0;
      if (adv.type === 'advance') {
        staff.advanceBalance = currentAdv + adv.amount;
      } else {
        staff.advanceBalance = Math.max(0, currentAdv - adv.amount);
      }
      await this.setItem('staff', staff);
    }

    this.notify();
    return newAdv;
  }

  // --- Attendance ---
  public async recordAttendance(att: Omit<Attendance, 'id'>): Promise<Attendance> {
    // If attendance already recorded today for this staff, update it
    const all = await this.getAll<Attendance>('attendance');
    const existing = all.find((a) => a.staffId === att.staffId && a.date === att.date);

    const newAtt: Attendance = {
      ...att,
      id: existing ? existing.id : 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
    };

    await this.setItem('attendance', newAtt);
    this.notify();
    return newAtt;
  }

  public async getAttendance(businessId?: BusinessId, date?: string): Promise<Attendance[]> {
    const all = await this.getAll<Attendance>('attendance');
    let res = all;
    if (businessId && businessId !== 'personal') {
      res = res.filter((a) => a.businessId === businessId);
    }
    if (date) {
      res = res.filter((a) => a.date === date);
    }
    return res;
  }

  // --- Salaries ---
  public async getSalaries(businessId?: BusinessId, period?: string): Promise<SalaryRecord[]> {
    const all = await this.getAll<SalaryRecord>('salaries');
    let res = all;
    if (businessId && businessId !== 'personal') {
      res = res.filter((s) => s.businessId === businessId);
    }
    if (period) {
      res = res.filter((s) => s.period === period);
    }
    return res;
  }

  public async recordSalaryPayment(sal: Omit<SalaryRecord, 'id' | 'createdAt'>): Promise<SalaryRecord> {
    const newSal: SalaryRecord = {
      ...sal,
      id: 'sal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('salaries', newSal);

    // Deduct advance balance if advance was deducted in this salary payment
    if (sal.advanceDeducted > 0) {
      const staff = await this.getItem<string, Staff>('staff', sal.staffId);
      if (staff) {
        staff.advanceBalance = Math.max(0, (staff.advanceBalance || 0) - sal.advanceDeducted);
        await this.setItem('staff', staff);
      }
    }

    // Also record business expense for salary payment
    await this.addExpense({
      businessId: sal.businessId,
      amount: sal.netPaid,
      category: 'staff_salary',
      date: sal.date,
      paymentMethod: sal.paymentMethod,
      notes: `Staff Salary Payment to ${sal.staffName || 'Staff'} (${sal.period})`
    });

    this.notify();
    return newSal;
  }

  // --- Personal Finance & Contacts ---
  public async getPersonalTransactions(): Promise<PersonalTransaction[]> {
    return await this.getAll<PersonalTransaction>('personal_transactions');
  }

  public async addPersonalTransaction(tx: Omit<PersonalTransaction, 'id' | 'createdAt'>): Promise<PersonalTransaction> {
    const newTx: PersonalTransaction = {
      ...tx,
      id: 'ptx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('personal_transactions', newTx);
    this.notify();
    return newTx;
  }

  public async deletePersonalTransaction(id: string): Promise<void> {
    await this.deleteItem('personal_transactions', id);
    this.notify();
  }

  public async getPersonalContacts(): Promise<PersonalContact[]> {
    return await this.getAll<PersonalContact>('personal_contacts');
  }

  public async addPersonalContact(contact: Omit<PersonalContact, 'id' | 'createdAt'>): Promise<PersonalContact> {
    const newC: PersonalContact = {
      ...contact,
      id: 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('personal_contacts', newC);
    this.notify();
    return newC;
  }

  public async deletePersonalContact(id: string): Promise<void> {
    await this.deleteItem('personal_contacts', id);
    this.notify();
  }

  // --- Tasks, Reminders & Notes ---
  public async getTasks(): Promise<Task[]> {
    return await this.getAll<Task>('tasks');
  }

  public async addTask(task: Omit<Task, 'id' | 'createdAt' | 'completed'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      completed: false,
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('tasks', newTask);
    this.notify();
    return newTask;
  }

  public async toggleTask(id: string): Promise<void> {
    const t = await this.getItem<string, Task>('tasks', id);
    if (t) {
      t.completed = !t.completed;
      await this.setItem('tasks', t);
      this.notify();
    }
  }

  public async deleteTask(id: string): Promise<void> {
    await this.deleteItem('tasks', id);
    this.notify();
  }

  public async getReminders(): Promise<Reminder[]> {
    return await this.getAll<Reminder>('reminders');
  }

  public async addReminder(reminder: Omit<Reminder, 'id' | 'createdAt' | 'status'>): Promise<Reminder> {
    const newRem: Reminder = {
      ...reminder,
      status: 'active',
      id: 'rem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('reminders', newRem);

    // Also add to system notifications
    await this.addNotification({
      title: `Reminder: ${newRem.title}`,
      message: `Scheduled for ${new Date(newRem.dateTime).toLocaleString()}`,
      type: 'reminder'
    });

    this.notify();
    return newRem;
  }

  public async deleteReminder(id: string): Promise<void> {
    await this.deleteItem('reminders', id);
    this.notify();
  }

  public async getNotes(): Promise<Note[]> {
    return await this.getAll<Note>('notes');
  }

  public async addNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<Note> {
    const newNote: Note = {
      ...note,
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    await this.setItem('notes', newNote);
    this.notify();
    return newNote;
  }

  public async deleteNote(id: string): Promise<void> {
    await this.deleteItem('notes', id);
    this.notify();
  }

  // --- Notifications ---
  public async getNotifications(): Promise<NotificationItem[]> {
    return await this.getAll<NotificationItem>('notifications');
  }

  public async addNotification(notif: Omit<NotificationItem, 'id' | 'date' | 'read'>): Promise<NotificationItem> {
    const newNotif: NotificationItem = {
      ...notif,
      date: new Date().toISOString(),
      read: false,
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
    };
    await this.setItem('notifications', newNotif);
    this.notify();
    return newNotif;
  }

  public async markNotificationRead(id: string): Promise<void> {
    const n = await this.getItem<string, NotificationItem>('notifications', id);
    if (n) {
      n.read = true;
      await this.setItem('notifications', n);
      this.notify();
    }
  }

  // --- AI History ---
  public async getAICommandHistory(): Promise<AICommandHistory[]> {
    return await this.getAll<AICommandHistory>('ai_command_history');
  }

  public async addAIHistory(cmd: Omit<AICommandHistory, 'id' | 'timestamp'>): Promise<void> {
    const entry: AICommandHistory = {
      ...cmd,
      id: 'cmd_' + Date.now(),
      timestamp: new Date().toISOString()
    };
    await this.setItem('ai_command_history', entry);
    this.notify();
  }

  // --- Sync Queue & Backup ---
  private async addToSyncQueue(actionType: string, payload: any): Promise<void> {
    const item: SyncQueueItem = {
      id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      actionType,
      payloadJson: JSON.stringify(payload),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending'
    };
    await this.setItem('sync_queue', item);
  }

  public async getSyncQueue(): Promise<SyncQueueItem[]> {
    return await this.getAll<SyncQueueItem>('sync_queue');
  }

  public async exportDatabaseJSON(): Promise<string> {
    const stores = [
      'sales', 'expenses', 'purchases', 'inventory_items', 'stock_movements',
      'suppliers', 'supplier_payments', 'receivables', 'payables', 'personal_transactions',
      'staff', 'staff_transfers', 'manpower_plans', 'catering_events', 'catering_orders', 'staff_advances',
      'attendance', 'salaries', 'tasks', 'reminders', 'notes', 'notifications', 'app_settings'
    ];
    const exportData: Record<string, any> = {};

    for (const store of stores) {
      exportData[store] = await this.getAll(store);
    }

    return JSON.stringify({
      version: DB_VERSION,
      appName: 'GopalAI Assistant',
      exportedAt: new Date().toISOString(),
      data: exportData
    }, null, 2);
  }

  public async importDatabaseJSON(jsonStr: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.data) return false;

      const data = parsed.data;
      for (const storeName of Object.keys(data)) {
        if (Array.isArray(data[storeName])) {
          for (const item of data[storeName]) {
            await this.setItem(storeName, item);
          }
        }
      }
      this.notify();
      return true;
    } catch (err) {
      console.error('Failed to import database:', err);
      return false;
    }
  }

  // Clear all data (Reset to Strict Zero State)
  public async clearAllData(): Promise<void> {
    const stores = [
      'sales', 'expenses', 'purchases', 'inventory_items', 'stock_movements',
      'suppliers', 'supplier_payments', 'receivables', 'payables', 'personal_transactions',
      'staff', 'staff_transfers', 'manpower_plans', 'catering_events', 'catering_orders', 'staff_advances',
      'attendance', 'salaries', 'tasks', 'reminders', 'notes', 'notifications',
      'ai_command_history', 'sync_queue'
    ];
    for (const store of stores) {
      if (!this.db) await this.init();
      const tx = this.db!.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
    }
    this.notify();
  }
}

export const db = new DatabaseService();
