import { localDate } from './localDate';
import { sameProductName } from './productNames';
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

import { JAIN_SWEETS_INVENTORY } from '../data/jainSweetsInventory';

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
        this.ensureDefaultSettings().then(() => this.seedMenuInventory()).then(() => resolve(), reject);
      };

      request.onerror = (e) => {
        console.error('IndexedDB error:', e);
        reject(e);
      };
    });
  }

  // Each workspace has its own atomic import marker. Existing items are never
  // overwritten, and deleting an item does not cause it to return on reload.
  private async seedMenuInventory(): Promise<void> {
    if (!this.db) throw new Error('Database is not initialized');
    const database = this.db;
    let totalAdded = 0;
    const workspaces: BusinessId[] = ['jain-sweets', 'kesarwadi', 'paan-bai'];
    for (const businessId of workspaces) {
      const markerKey = `${businessId}-inventory-menu-v1`;
      totalAdded += await new Promise<number>((resolve, reject) => {
        const tx = database.transaction(['inventory_items', 'app_settings'], 'readwrite');
        const settings = tx.objectStore('app_settings');
        const inventory = tx.objectStore('inventory_items');
        let count = 0;
        const marker = settings.get(markerKey);
        marker.onsuccess = () => {
          if (marker.result) return;
          const request = inventory.getAll();
          request.onsuccess = () => {
            const normalize = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
            const existing = new Set((request.result as InventoryItem[])
              .filter(item => item.businessId === businessId)
              .map(item => normalize(item.name)));
            const now = new Date().toISOString();
            for (const product of JAIN_SWEETS_INVENTORY) {
              const key = normalize(product.name);
              if (existing.has(key)) continue;
              existing.add(key);
              inventory.add({
                id: `menu_${crypto.randomUUID()}`,
                businessId,
                name: product.name,
                category: product.category,
                stockQuantity: 0,
                unit: '',
                minStockLevel: 0,
                reorderAlertEnabled: false,
                lastUpdated: now
              } satisfies InventoryItem);
              count++;
            }
            settings.put({ key: markerKey, importedAt: now });
          };
        };
        tx.oncomplete = () => resolve(count);
        tx.onabort = () => reject(tx.error || new Error(`Could not import inventory for ${businessId}`));
        tx.onerror = () => reject(tx.error || new Error(`Could not import inventory for ${businessId}`));
      });
    }
    if (totalAdded) this.notify();
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
      language: 'english',
      voiceGender: 'female',
      voiceSpeed: 1,
      ttsEnabled: true,
      cloudSyncEnabled: true,
      backgroundTasksEnabled: true,
      ownerName: ''
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
        language: 'english',
        voiceGender: 'female',
        voiceSpeed: 1,
        ttsEnabled: true,
        cloudSyncEnabled: true,
        backgroundTasksEnabled: true,
        ownerName: ''
      });
    }
  }

  // --- Helper Methods ---
  private async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init();
    if (!this.db || !this.db.objectStoreNames.contains(storeName)) throw new Error(`Database store "${storeName}" is unavailable.`);
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error || new Error(`Could not read ${storeName}.`));
        tx.onabort = () => reject(tx.error || new Error(`Reading ${storeName} was interrupted.`));
      } catch (error) { reject(error); }
    });
  }

  private async getItem<K, T>(storeName: string, key: K): Promise<T | null> {
    if (!this.db) await this.init();
    if (!this.db || !this.db.objectStoreNames.contains(storeName)) throw new Error(`Database store "${storeName}" is unavailable.`);
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(key as IDBValidKey);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error || new Error(`Could not read ${storeName}.`));
        tx.onabort = () => reject(tx.error || new Error(`Reading ${storeName} was interrupted.`));
      } catch (error) { reject(error); }
    });
  }

  private async setItem<T extends { id?: string; key?: string }>(storeName: string, item: T): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db || !this.db.objectStoreNames.contains(storeName)) throw new Error(`Database store "${storeName}" is unavailable.`);
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(item);
        // Request success is not enough: a later abort rolls back the write.
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error || new Error(`Saving ${storeName} was interrupted.`));
        tx.onerror = () => reject(tx.error || new Error(`Could not save ${storeName}.`));
      } catch (error) { reject(error); }
    });
  }

  private async deleteItem(storeName: string, id: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db || !this.db.objectStoreNames.contains(storeName)) throw new Error(`Database store "${storeName}" is unavailable.`);
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error || new Error(`Deleting from ${storeName} was interrupted.`));
        tx.onerror = () => reject(tx.error || new Error(`Could not delete from ${storeName}.`));
      } catch (error) { reject(error); }
    });
  }

  // --- Sales ---
  public async getSales(businessId?: BusinessId): Promise<Sale[]> {
    const all = await this.getAll<Sale>('sales');
    if (!businessId) return all;
    return all.filter((s) => s.businessId === businessId);
  }

  public async addSale(sale: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
    if (!Number.isFinite(sale.amount) || sale.amount <= 0 || sale.items.some(item => !item.itemName.trim() || !Number.isFinite(item.quantity) || item.quantity <= 0 || !item.unit)) throw new Error('Enter a valid sale amount and item quantity.');
    if (!this.db) await this.init();
    const newSale: Sale = { ...sale, id: `sale_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
    const sync: SyncQueueItem = { id: `sync_${crypto.randomUUID()}`, actionType: 'ADD_SALE', payloadJson: JSON.stringify(newSale), timestamp: new Date().toISOString(), retryCount: 0, status: 'pending' };
    await new Promise<void>((resolve, reject) => {
      let reason = 'Could not save the sale.';
      try {
        const tx = this.db!.transaction(['sales', 'inventory_items', 'stock_movements', 'sync_queue'], 'readwrite');
        const inventory = tx.objectStore('inventory_items');
        const req = inventory.getAll();
        req.onsuccess = () => {
          const items = (req.result as InventoryItem[]).filter(i => i.businessId === sale.businessId);
          for (const item of sale.items) {
            const matches = items.filter(i => sameProductName(i.name, item.itemName));
            if (matches.length > 1) { reason = `Multiple inventory items match ${item.itemName}. Resolve duplicates before recording this sale.`; tx.abort(); return; }
            const stock = matches[0];
            if (!stock) continue; // An untracked sale item does not create a phantom stock movement.
            if (!stock.unit || stock.unit.toLowerCase() !== item.unit.toLowerCase()) { reason = `Check the inventory unit for ${item.itemName} before recording this sale.`; tx.abort(); return; }
            if (!Number.isFinite(stock.stockQuantity) || stock.stockQuantity < item.quantity) { reason = `Not enough stock for ${item.itemName}.`; tx.abort(); return; }
            stock.stockQuantity -= item.quantity; stock.lastUpdated = new Date().toISOString();
            inventory.put(stock);
            tx.objectStore('stock_movements').put({ id: `sm_${crypto.randomUUID()}`, businessId: sale.businessId, inventoryItemId: stock.id, itemName: stock.name, type: 'sale', quantity: item.quantity, unit: item.unit, notes: `Sale #${newSale.id}`, createdAt: new Date().toISOString() } satisfies StockMovement);
          }
          tx.objectStore('sales').put(newSale); tx.objectStore('sync_queue').put(sync);
        };
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error || new Error(reason));
        tx.onerror = () => reject(tx.error || new Error(reason));
      } catch (error) { reject(error); }
    });
    this.notify();
    return newSale;
  }

  public async deleteSale(id: string): Promise<void> {
    if (!this.db) await this.init();
    await new Promise<void>((resolve, reject) => {
      let reason = 'Could not delete the sale.';
      try {
        const tx = this.db!.transaction(['sales', 'inventory_items', 'stock_movements'], 'readwrite');
        const sales = tx.objectStore('sales'); const inventory = tx.objectStore('inventory_items'); const movements = tx.objectStore('stock_movements');
        const saleReq = sales.get(id); const invReq = inventory.getAll(); const movReq = movements.getAll();
        let ready = 0;
        const apply = () => {
          if (++ready !== 3 || !saleReq.result) return;
          const sale = saleReq.result as Sale;
          const stockItems = invReq.result as InventoryItem[];
          for (const move of (movReq.result as StockMovement[]).filter(m => m.businessId === sale.businessId && m.type === 'sale' && m.notes === `Sale #${id}` && m.inventoryItemId)) {
            const stock = stockItems.find(item => item.id === move.inventoryItemId && item.businessId === sale.businessId);
            if (!stock || stock.unit.toLowerCase() !== move.unit.toLowerCase()) { reason = `Cannot restore stock for ${move.itemName}; check the inventory item and unit first.`; tx.abort(); return; }
            stock.stockQuantity += move.quantity; stock.lastUpdated = new Date().toISOString(); inventory.put(stock); movements.delete(move.id);
          }
          sales.delete(id);
        };
        saleReq.onsuccess = apply; invReq.onsuccess = apply; movReq.onsuccess = apply;
        tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error || new Error(reason)); tx.onerror = () => reject(tx.error || new Error(reason));
      } catch (error) { reject(error); }
    });
    this.notify();
  }

  // --- Expenses ---
  public async getExpenses(businessId?: BusinessId): Promise<Expense[]> {
    const all = await this.getAll<Expense>('expenses');
    if (!businessId) return all;
    return all.filter((e) => e.businessId === businessId);
  }

  public async addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    if (!Number.isFinite(expense.amount) || expense.amount <= 0) throw new Error('Enter a valid expense amount.');
    if (!this.db) await this.init();
    const newExpense: Expense = { ...expense, id: `exp_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
    const sync: SyncQueueItem = { id: `sync_${crypto.randomUUID()}`, actionType: 'ADD_EXPENSE', payloadJson: JSON.stringify(newExpense), timestamp: new Date().toISOString(), retryCount: 0, status: 'pending' };
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(['expenses', 'sync_queue'], 'readwrite');
        tx.objectStore('expenses').put(newExpense); tx.objectStore('sync_queue').put(sync);
        tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error || new Error('Saving the expense was interrupted.')); tx.onerror = () => reject(tx.error || new Error('Could not save the expense.'));
      } catch (error) { reject(error); }
    });
    this.notify(); return newExpense;
  }

  public async deleteExpense(id: string): Promise<void> {
    await this.deleteItem('expenses', id);
    this.notify();
  }

  // --- Purchases ---
  public async getPurchases(businessId?: BusinessId): Promise<Purchase[]> {
    const all = await this.getAll<Purchase>('purchases');
    if (!businessId) return all;
    return all.filter((p) => p.businessId === businessId);
  }

  public async addPurchase(purchase: Omit<Purchase, 'id' | 'createdAt' | 'pendingAmount' | 'paymentStatus'>): Promise<Purchase> {
    if (!purchase.itemName.trim() || !purchase.unit.trim() || !Number.isFinite(purchase.quantity) || purchase.quantity <= 0 || !Number.isFinite(purchase.amount) || purchase.amount <= 0 || !Number.isFinite(purchase.paidAmount) || purchase.paidAmount < 0 || purchase.paidAmount > purchase.amount) throw new Error('Enter a valid item, quantity, amount and paid amount. Paid amount cannot exceed the bill.');
    if (!this.db) await this.init();
    const pendingAmount = purchase.amount - purchase.paidAmount;
    const paymentStatus: Purchase['paymentStatus'] = pendingAmount === 0 ? 'paid' : purchase.paidAmount > 0 ? 'partial' : 'pending';
    const newPurchase: Purchase = { ...purchase, itemName: purchase.itemName.trim(), supplierName: purchase.supplierName.trim(), pendingAmount, paymentStatus, id: `pur_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
    const sync: SyncQueueItem = { id: `sync_${crypto.randomUUID()}`, actionType: 'ADD_PURCHASE', payloadJson: JSON.stringify(newPurchase), timestamp: new Date().toISOString(), retryCount: 0, status: 'pending' };
    await new Promise<void>((resolve, reject) => {
      let reason = 'Could not save the purchase.';
      try {
        const tx = this.db!.transaction(['purchases', 'inventory_items', 'stock_movements', 'suppliers', 'sync_queue'], 'readwrite');
        const inventory = tx.objectStore('inventory_items'); const suppliers = tx.objectStore('suppliers');
        const invReq = inventory.getAll(); const supReq = suppliers.getAll();
        let invReady = false, supReady = false;
        const apply = () => {
          if (!invReady || !supReady) return;
          const matches = (invReq.result as InventoryItem[]).filter(i => i.businessId === purchase.businessId && sameProductName(i.name, newPurchase.itemName));
          if (matches.length > 1) { reason = `Multiple inventory items match ${newPurchase.itemName}. Resolve duplicates first.`; tx.abort(); return; }
          let stock = matches[0];
          if (stock && stock.unit && stock.unit.toLowerCase() !== purchase.unit.toLowerCase()) { reason = `Inventory unit for ${newPurchase.itemName} is ${stock.unit}, not ${purchase.unit}.`; tx.abort(); return; }
          if (stock) { stock.stockQuantity += purchase.quantity; stock.unit ||= purchase.unit; stock.lastUpdated = new Date().toISOString(); }
          else stock = { id: `inv_${crypto.randomUUID()}`, businessId: purchase.businessId, name: newPurchase.itemName, category: 'Raw Materials', stockQuantity: purchase.quantity, unit: purchase.unit, minStockLevel: 0, reorderAlertEnabled: false, lastUpdated: new Date().toISOString() };
          inventory.put(stock);
          tx.objectStore('stock_movements').put({ id: `sm_${crypto.randomUUID()}`, businessId: purchase.businessId, inventoryItemId: stock.id, itemName: stock.name, type: 'purchase', quantity: purchase.quantity, unit: purchase.unit, notes: newPurchase.supplierName ? `Purchase from ${newPurchase.supplierName}` : 'Purchase', createdAt: new Date().toISOString() } satisfies StockMovement);
          if (newPurchase.supplierName) {
            const matches = (supReq.result as Supplier[]).filter(s => s.businessId === purchase.businessId && s.name.trim().toLocaleLowerCase() === newPurchase.supplierName.toLocaleLowerCase());
            if (matches.length > 1) { reason = `Multiple suppliers match ${newPurchase.supplierName}. Resolve duplicates first.`; tx.abort(); return; }
            const supplier: Supplier = matches[0] || { id: `sup_${crypto.randomUUID()}`, businessId: purchase.businessId, name: newPurchase.supplierName, contact: '', totalPurchases: 0, totalPaid: 0, totalPayable: 0, createdAt: new Date().toISOString() };
            supplier.totalPurchases += purchase.amount; supplier.totalPaid += purchase.paidAmount; supplier.totalPayable = Math.max(0, supplier.totalPurchases - supplier.totalPaid);
            suppliers.put(supplier);
          }
          tx.objectStore('purchases').put(newPurchase); tx.objectStore('sync_queue').put(sync);
        };
        invReq.onsuccess = () => { invReady = true; apply(); }; supReq.onsuccess = () => { supReady = true; apply(); };
        tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error || new Error(reason)); tx.onerror = () => reject(tx.error || new Error(reason));
      } catch (error) { reject(error); }
    });
    this.notify();
    return newPurchase;
  }

  // --- Inventory ---
  public async getInventory(businessId?: BusinessId): Promise<InventoryItem[]> {
    const all = await this.getAll<InventoryItem>('inventory_items');
    if (!businessId) return all;
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
    if (!businessId) return all;
    return all.filter((sm) => sm.businessId === businessId);
  }

  // --- Suppliers & Payables ---
  public async getSuppliers(businessId?: BusinessId): Promise<Supplier[]> {
    const all = await this.getAll<Supplier>('suppliers');
    if (!businessId) return all;
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

  // Records a payment already made; this does not initiate a bank transfer.
  public async paySupplier(supplierId: string, amount: number, paymentMethod: 'cash' | 'upi' | 'bank' | 'cheque', notes?: string): Promise<SupplierPayment> {
    if (!Number.isFinite(amount) || amount <= 0 || !['cash', 'upi', 'bank', 'cheque'].includes(paymentMethod)) throw new Error('Enter a valid payment amount and method.');
    if (!this.db) await this.init();
    let saved: SupplierPayment | undefined;
    await new Promise<void>((resolve, reject) => {
      let reason = 'Could not record the supplier payment.';
      try {
        const tx = this.db!.transaction(['suppliers', 'supplier_payments', 'expenses', 'sync_queue'], 'readwrite');
        const suppliers = tx.objectStore('suppliers'); const req = suppliers.get(supplierId);
        req.onsuccess = () => {
          const sup = req.result as Supplier | undefined;
          if (!sup) { reason = 'Supplier not found.'; tx.abort(); return; }
          if (!Number.isFinite(sup.totalPayable) || amount > sup.totalPayable) { reason = 'Payment exceeds the recorded outstanding amount.'; tx.abort(); return; }
          const now = new Date();
          const payment: SupplierPayment = { id: `pay_${crypto.randomUUID()}`, supplierId, businessId: sup.businessId, amount, date: localDate(now), paymentMethod, notes, status: 'completed', createdAt: now.toISOString() };
          const expense: Expense = { id: `exp_${crypto.randomUUID()}`, businessId: sup.businessId, amount, category: 'raw_materials', date: payment.date, paymentMethod: paymentMethod === 'cheque' ? 'bank' : paymentMethod, notes: `Supplier Payment to ${sup.name}${notes ? ` (${notes})` : ''}`, createdAt: now.toISOString() };
          const sync: SyncQueueItem = { id: `sync_${crypto.randomUUID()}`, actionType: 'ADD_EXPENSE', payloadJson: JSON.stringify(expense), timestamp: now.toISOString(), retryCount: 0, status: 'pending' };
          sup.totalPaid += amount; sup.totalPayable = Math.max(0, sup.totalPurchases - sup.totalPaid);
          suppliers.put(sup); tx.objectStore('supplier_payments').put(payment); tx.objectStore('expenses').put(expense); tx.objectStore('sync_queue').put(sync); saved = payment;
        };
        tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error || new Error(reason)); tx.onerror = () => reject(tx.error || new Error(reason));
      } catch (error) { reject(error); }
    });
    if (!saved) throw new Error('Could not verify the supplier payment.');
    this.notify();
    return saved;
  }

  public async getSupplierPayments(businessId?: BusinessId): Promise<SupplierPayment[]> {
    const all = await this.getAll<SupplierPayment>('supplier_payments');
    if (!businessId) return all;
    return all.filter((sp) => sp.businessId === businessId);
  }

  // --- Receivables & Customer Credit ---
  public async getReceivables(businessId?: BusinessId): Promise<Receivable[]> {
    const all = await this.getAll<Receivable>('receivables');
    if (!businessId) return all;
    return all.filter((r) => r.businessId === businessId);
  }

  public async getPayables(businessId?: BusinessId): Promise<Payable[]> {
    const all = await this.getAll<Payable>('payables');
    if (!businessId) return all;
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
    if (!rec) throw new Error('Receivable not found.');
    {
      rec.paidAmount = rec.amount;
      rec.status = 'paid';
      await this.setItem('receivables', rec);
      this.notify();
    }
  }

  public async markPayablePaid(id: string): Promise<void> {
    const pay = await this.getItem<string, Payable>('payables', id);
    if (!pay) throw new Error('Payable not found.');
    {
      pay.paidAmount = pay.amount;
      pay.status = 'paid';
      await this.setItem('payables', pay);
      this.notify();
    }
  }

  // --- Staff, Attendance & Payroll ---
  public async getStaff(businessId?: BusinessId): Promise<Staff[]> {
    const all = await this.getAll<Staff>('staff');
    if (!businessId) return all;
    return all.filter((s) => (s.assignedLocation || s.businessId) === businessId);
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
    if (!businessId) return all;
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
    if (!order.customerName.trim() || !order.eventDate || !Number.isInteger(order.guestCount) || order.guestCount <= 0 || !Number.isFinite(order.totalAmount) || order.totalAmount <= 0 || !Number.isFinite(order.advanceAmount) || order.advanceAmount < 0 || order.advanceAmount > order.totalAmount) throw new Error('Enter valid catering booking details and advance.');
    const newOrder: CateringOrder = { ...order, pendingAmount: order.totalAmount - order.advanceAmount, id: `cat_ord_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
    // The advance date, payment method and reminder time are not provided by this form.
    // Do not invent a sale or a scheduled reminder from the booking.
    await this.setItem('catering_orders', newOrder);
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
    if (!this.db) await this.init();
    await new Promise<void>((resolve, reject) => {
      let reason = 'Could not save allocation.';
      try {
        const tx = this.db!.transaction(['catering_orders', 'staff', 'attendance'], 'readwrite');
        const orders = tx.objectStore('catering_orders');
        const orderReq = orders.getAll(); const staffReq = tx.objectStore('staff').getAll(); const attendanceReq = tx.objectStore('attendance').getAll(); let ready = 0;
        const apply = () => {
          if (++ready !== 3) return;
          const all = orderReq.result as CateringOrder[]; const order = all.find(o => o.id === orderId);
          const employees = staffReq.result as Staff[]; const attendance = attendanceReq.result as Attendance[];
          if (!order) { reason = 'Booking no longer exists.'; tx.abort(); return; }
          if (new Set(staffIds).size !== staffIds.length || staffIds.some(id => !employees.some(s => s.id === id))) { reason = 'A selected staff member no longer exists.'; tx.abort(); return; }
          if (staffIds.some(id => all.some(o => o.id !== orderId && o.status !== 'cancelled' && o.eventDate === order.eventDate && o.assignedStaffIds.includes(id)) || attendance.some(a => a.staffId === id && a.date === order.eventDate && (a.status === 'absent' || a.status === 'weekly_off')))) { reason = 'A selected staff member is unavailable for this date. Review the allocation.'; tx.abort(); return; }
          order.assignedStaffIds = [...staffIds]; orders.put(order);
        };
        orderReq.onsuccess = apply; staffReq.onsuccess = apply; attendanceReq.onsuccess = apply;
        tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error || new Error(reason)); tx.onerror = () => reject(tx.error || new Error(reason));
      } catch (error) { reject(error); }
    });
    this.notify();
  }

  // --- Advances & Deductions ---
  public async getStaffAdvances(staffId?: string): Promise<StaffAdvance[]> {
    const all = await this.getAll<StaffAdvance>('staff_advances');
    if (staffId) return all.filter((a) => a.staffId === staffId);
    return all;
  }

  public async addStaffAdvance(adv: Omit<StaffAdvance, 'id' | 'createdAt'>): Promise<StaffAdvance> {
    if (!Number.isFinite(adv.amount) || adv.amount <= 0) throw new Error('Enter a positive advance amount.');
    if (!this.db) await this.init();
    const newAdv: StaffAdvance = { ...adv, id: `adv_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
    await new Promise<void>((resolve, reject) => {
      let reason = 'Could not record staff advance.';
      try {
        const tx = this.db!.transaction(['staff_advances', 'staff'], 'readwrite'); const staffStore = tx.objectStore('staff');
        const request = staffStore.get(adv.staffId);
        request.onsuccess = () => {
          const staff = request.result as Staff | undefined;
          if (!staff || (staff.assignedLocation || staff.businessId) !== adv.businessId) { reason = 'Staff member or assigned workspace changed.'; tx.abort(); return; }
          const balance = staff.advanceBalance || 0;
          if (adv.type === 'deduction' && adv.amount > balance) { reason = 'Deduction cannot exceed the advance balance.'; tx.abort(); return; }
          staff.advanceBalance = adv.type === 'advance' ? balance + adv.amount : balance - adv.amount;
          staffStore.put(staff); tx.objectStore('staff_advances').put(newAdv);
        };
        tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error || new Error(reason)); tx.onerror = () => reject(tx.error || new Error(reason));
      } catch (error) { reject(error); }
    });
    this.notify(); return newAdv;
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
    if (businessId) {
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
    if (businessId) {
      res = res.filter((s) => s.businessId === businessId);
    }
    if (period) {
      res = res.filter((s) => s.period === period);
    }
    return res;
  }

  public async recordSalaryPayment(sal: Omit<SalaryRecord, 'id' | 'createdAt'>): Promise<SalaryRecord> {
    if (![sal.amount, sal.advanceDeducted, sal.netPaid, sal.overtimePay ?? 0, sal.otherDeductions ?? 0].every(n => Number.isFinite(n) && n >= 0) || !sal.period || sal.status !== 'paid') throw new Error('Enter valid payroll amounts and period.');
    if (!this.db) await this.init();
    const newSal: SalaryRecord = { ...sal, id: `sal_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
    await new Promise<void>((resolve, reject) => {
      let reason = 'Could not record salary.';
      try {
        const tx = this.db!.transaction(['salaries', 'staff', 'expenses', 'sync_queue'], 'readwrite');
        const salaries = tx.objectStore('salaries'); const staffStore = tx.objectStore('staff');
        const salReq = salaries.getAll(); const staffReq = staffStore.get(sal.staffId); let ready = 0;
        const apply = () => {
          if (++ready !== 2) return;
          const staff = staffReq.result as Staff | undefined;
          if (!staff || (staff.assignedLocation || staff.businessId) !== sal.businessId) { reason = 'Staff member or assigned workspace changed. Review payroll.'; tx.abort(); return; }
          if ((salReq.result as SalaryRecord[]).some(existing => existing.staffId === sal.staffId && existing.period === sal.period && existing.status === 'paid')) { reason = 'A paid salary is already recorded for this staff member and period.'; tx.abort(); return; }
          if (sal.advanceDeducted > (staff.advanceBalance || 0)) { reason = 'The advance balance changed. Recalculate payroll.'; tx.abort(); return; }
          if (sal.advanceDeducted > 0) { staff.advanceBalance = (staff.advanceBalance || 0) - sal.advanceDeducted; staffStore.put(staff); }
          salaries.put(newSal);
          if (sal.netPaid > 0) {
            const expense: Expense = { id:`exp_${crypto.randomUUID()}`, businessId:sal.businessId, amount:sal.netPaid, category:'staff_salary', date:sal.date, paymentMethod:sal.paymentMethod, notes:`Staff Salary Payment to ${sal.staffName || 'Staff'} (${sal.period})`, createdAt:new Date().toISOString() };
            const sync: SyncQueueItem = { id:`sync_${crypto.randomUUID()}`, actionType:'ADD_EXPENSE', payloadJson:JSON.stringify(expense), timestamp:new Date().toISOString(), retryCount:0, status:'pending' };
            tx.objectStore('expenses').put(expense); tx.objectStore('sync_queue').put(sync);
          }
        };
        salReq.onsuccess = apply; staffReq.onsuccess = apply;
        tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error || new Error(reason)); tx.onerror = () => reject(tx.error || new Error(reason));
      } catch (error) { reject(error); }
    });
    this.notify(); return newSal;
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

  // --- Sync Queue ---
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

  // Clear all data (Reset to Strict Zero State)
  public async clearAllData(): Promise<void> {
    const stores = [
      'sales', 'expenses', 'purchases', 'inventory_items', 'stock_movements',
      'suppliers', 'supplier_payments', 'receivables', 'payables', 'personal_transactions', 'personal_contacts',
      'staff', 'staff_transfers', 'manpower_plans', 'catering_events', 'catering_orders', 'staff_advances',
      'attendance', 'salaries', 'tasks', 'reminders', 'notes', 'notifications',
      'ai_command_history', 'background_jobs', 'sync_queue'
    ];
    if (!this.db) await this.init();
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(stores, 'readwrite');
        for (const store of stores) tx.objectStore(store).clear();
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error || new Error('Clearing data was interrupted; no records were cleared.'));
        tx.onerror = () => reject(tx.error || new Error('Could not clear records.'));
      } catch (error) { reject(error); }
    });
    this.notify();
  }
}

export const db = new DatabaseService();
