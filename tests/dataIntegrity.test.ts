// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/services/db';
import { localDate } from '../src/services/localDate';

beforeEach(async () => { await db.init(); });
afterEach(() => vi.restoreAllMocks());

describe('storage and stock integrity', () => {
  it('adds a purchase and stock atomically without creating a fictitious supplier', async () => {
    const name = 'Integrity test item';
    const before = await db.getSuppliers('paan-bai');
    const purchase = await db.addPurchase({businessId:'paan-bai', itemName:name, quantity:5, unit:'kg', amount:120, supplierName:'', date:'2026-10-31', paidAmount:0});
    expect(purchase.paymentStatus).toBe('pending');
    const item = (await db.getInventory('paan-bai')).find(x => x.name === name)!;
    expect(item).toMatchObject({stockQuantity:5, unit:'kg', minStockLevel:0, reorderAlertEnabled:false});
    expect(await db.getSuppliers('paan-bai')).toEqual(before);
    const movement = (await db.getStockMovements('paan-bai')).find(x => x.inventoryItemId === item.id);
    expect(movement).toMatchObject({type:'purchase', quantity:5, businessId:'paan-bai'});
    expect((await db.getInventory('jain-sweets')).some(x => x.name === name)).toBe(false);
    const count = (await db.getPurchases('paan-bai')).length;
    await expect(db.addPurchase({businessId:'paan-bai',itemName:name,quantity:2,unit:'pcs',amount:10,supplierName:'',date:'2026-10-31',paidAmount:0})).rejects.toThrow(/unit/i);
    await expect(db.addPurchase({businessId:'paan-bai',itemName:name,quantity:-2,unit:'kg',amount:10,supplierName:'',date:'2026-10-31',paidAmount:11})).rejects.toThrow();
    expect((await db.getPurchases('paan-bai')).length).toBe(count);
    expect((await db.getInventory('paan-bai')).find(x => x.id === item.id)?.stockQuantity).toBe(5);
  });
  it('decrements tracked sales, restores stock on deletion and never writes phantom movements', async () => {
    const item = (await db.getInventory('paan-bai')).find(x => x.name === 'Integrity test item')!;
    const makeItem = (name:string, qty:number) => ({id:'test', itemName:name, quantity:qty, unit:'kg', price:10, total:qty*10});
    const sale = await db.addSale({businessId:'paan-bai', amount:20, date:'2026-10-31', paymentMethod:'cash', items:[makeItem(item.name,2)]});
    expect((await db.getInventory('paan-bai')).find(x => x.id === item.id)?.stockQuantity).toBe(3);
    expect((await db.getStockMovements('paan-bai')).some(x => x.inventoryItemId === item.id && x.notes === `Sale #${sale.id}`)).toBe(true);
    const count = (await db.getSales('paan-bai')).length;
    await expect(db.addSale({businessId:'paan-bai', amount:200, date:'2026-10-31', paymentMethod:'cash', items:[makeItem(item.name,20)]})).rejects.toThrow(/not enough stock/i);
    expect((await db.getSales('paan-bai')).length).toBe(count);
    const untracked = await db.addSale({businessId:'paan-bai', amount:10, date:'2026-10-31', paymentMethod:'cash', items:[makeItem('Untracked test',1)]});
    expect((await db.getStockMovements('paan-bai')).some(x => x.notes === `Sale #${untracked.id}`)).toBe(false);
    await db.deleteSale(sale.id);
    expect((await db.getInventory('paan-bai')).find(x => x.id === item.id)?.stockQuantity).toBe(5);
    expect((await db.getStockMovements('paan-bai')).some(x => x.notes === `Sale #${sale.id}`)).toBe(false);
  });
  it('records supplier payments atomically and rejects overpayment', async () => {
    const purchase = await db.addPurchase({businessId:'kesarwadi',itemName:'Supplier test item',quantity:2,unit:'kg',amount:100,supplierName:'Supplier test',date:'2026-10-31',paidAmount:0});
    const supplier = (await db.getSuppliers('kesarwadi')).find(s => s.name === purchase.supplierName)!;
    const beforePayments = (await db.getSupplierPayments('kesarwadi')).length;
    await expect(db.paySupplier(supplier.id, 101, 'cash')).rejects.toThrow(/exceeds/i);
    expect((await db.getSupplierPayments('kesarwadi')).length).toBe(beforePayments);
    await db.paySupplier(supplier.id, 40, 'upi');
    expect((await db.getSuppliers('kesarwadi')).find(s => s.id === supplier.id)).toMatchObject({ totalPaid: 40, totalPayable: 60 });
    expect((await db.getSupplierPayments('kesarwadi')).length).toBe(beforePayments + 1);
    expect((await db.getExpenses('kesarwadi')).some(e => e.amount === 40 && e.notes?.includes('Supplier test'))).toBe(true);
  });
  it('matches supplied Hindi and English catalogue names without duplicating stock', async () => {
    const stock = (await db.getInventory('jain-sweets')).find(i => i.name === 'Peda')!;
    await db.addPurchase({businessId:'jain-sweets',itemName:'पेड़ा',quantity:3,unit:'kg',amount:120,supplierName:'',date:'2026-10-31',paidAmount:0});
    const items = await db.getInventory('jain-sweets');
    expect(items.find(i => i.id === stock.id)?.stockQuantity).toBe(3);
    expect(items.filter(i => i.name === 'पेड़ा')).toHaveLength(0);
    const sale = await db.addSale({businessId:'jain-sweets',amount:40,date:'2026-10-31',paymentMethod:'cash',items:[{id:'item',itemName:'पेड़ा',quantity:1,unit:'kg',price:40,total:40}]});
    expect((await db.getInventory('jain-sweets')).find(i => i.id === stock.id)?.stockQuantity).toBe(2);
    await db.deleteSale(sale.id);
    expect((await db.getInventory('jain-sweets')).find(i => i.id === stock.id)?.stockQuantity).toBe(3);
  });
  it('counts transferred staff in their assigned workspace only', async () => {
    await db.addStaff({name:'Transfer test', role:'Helper', phone:'', businessId:'jain-sweets', assignedLocation:'paan-bai', salaryAmount:0, salaryCycle:'monthly', dateJoined:'2026-10-31'});
    expect((await db.getStaff('jain-sweets')).some(s => s.name === 'Transfer test')).toBe(false);
    expect((await db.getStaff('paan-bai')).some(s => s.name === 'Transfer test')).toBe(true);
  });
  it('records payroll once and does not deduct advances on a duplicate', async () => {
    const staff = await db.addStaff({name:'Payroll test', role:'Helper',phone:'',businessId:'kesarwadi',assignedLocation:'kesarwadi',salaryAmount:100,salaryCycle:'daily',dateJoined:'2026-10-31',advanceBalance:30});
    const record = {staffId:staff.id,staffName:staff.name,businessId:'kesarwadi' as const,amount:100,advanceDeducted:20,netPaid:80,date:'2026-10-31',period:'2026-10',paymentMethod:'cash' as const,status:'paid' as const};
    await db.recordSalaryPayment(record);
    await expect(db.recordSalaryPayment(record)).rejects.toThrow(/already recorded/i);
    expect((await db.getStaff('kesarwadi')).find(s => s.id === staff.id)?.advanceBalance).toBe(10);
    expect((await db.getSalaries('kesarwadi')).filter(s => s.staffId === staff.id)).toHaveLength(1);
    expect((await db.getExpenses('kesarwadi')).filter(e => e.notes?.includes('Payroll test'))).toHaveLength(1);
  });
  it('does not fabricate an advance sale or event reminder for a catering booking', async () => {
    await db.addCateringOrder({ customerName:'Event customer', customerPhone:'', eventType:'wedding',eventDate:'2026-12-01',venue:'',guestCount:20,menuItems:[],totalAmount:1000,advanceAmount:250,transportRequired:false,equipmentRequired:false,status:'enquiry',requiredCooks:1,requiredHelpers:1,requiredWaiters:1,requiredSupervisors:1,requiredCleaners:1,requiredDrivers:0,assignedStaffIds:[] });
    expect(await db.getSales('gopal-caterers')).toHaveLength(0);
    expect(await db.getReminders()).toHaveLength(0);
    expect((await db.getCateringOrders())[0].pendingAmount).toBe(750);
  });
  it('rejects excessive staff deductions without changing balance or adding a record', async () => {
    const staff = await db.addStaff({name:'Advance test', role:'Helper', phone:'',businessId:'kesarwadi',assignedLocation:'kesarwadi',salaryAmount:100,salaryCycle:'daily',dateJoined:'2026-10-31',advanceBalance:20});
    await expect(db.addStaffAdvance({staffId:staff.id,staffName:staff.name,businessId:'kesarwadi',type:'deduction',amount:21,date:'2026-10-31'})).rejects.toThrow(/exceed/i);
    expect((await db.getStaff('kesarwadi')).find(s => s.id === staff.id)?.advanceBalance).toBe(20);
    expect(await db.getStaffAdvances(staff.id)).toHaveLength(0);
  });
  it('rejects conflicting catering staff allocations', async () => {
    const staff = await db.addStaff({name:'Allocation test',role:'Cook',phone:'',businessId:'gopal-caterers',assignedLocation:'gopal-caterers',salaryAmount:100,salaryCycle:'daily',dateJoined:'2026-10-31'});
    const data = {customerName:'Customer',customerPhone:'',eventType:'other' as const,eventDate:'2026-12-01',venue:'',guestCount:20,menuItems:[],totalAmount:1000,advanceAmount:0,transportRequired:false,equipmentRequired:false,status:'confirmed' as const,requiredCooks:1,requiredHelpers:1,requiredWaiters:1,requiredSupervisors:1,requiredCleaners:1,requiredDrivers:0,assignedStaffIds:[]};
    const first=await db.addCateringOrder(data); const second=await db.addCateringOrder(data);
    await db.assignStaffToCateringOrder(first.id,[staff.id]);
    await expect(db.assignStaffToCateringOrder(second.id,[staff.id])).rejects.toThrow(/unavailable/i);
    expect((await db.getCateringOrders()).find(o => o.id === second.id)?.assignedStaffIds).toEqual([]);
  });
  it('rejects an aborted write rather than claiming it was saved', async () => {
    const conn = (db as any).db as IDBDatabase;
    const original = conn.transaction.bind(conn);
    const spy = vi.spyOn(conn, 'transaction').mockImplementation(((names: string | string[], mode?: IDBTransactionMode, options?: IDBTransactionOptions) => {
      const tx = original(names, mode, options);
      if (names === 'tasks' && mode === 'readwrite') queueMicrotask(() => tx.abort());
      return tx;
    }) as typeof conn.transaction);
    await expect(db.addTask({title:'aborted test', businessId:'personal', priority:'medium'})).rejects.toThrow();
    spy.mockRestore();
    expect((await db.getTasks()).some(x => x.title === 'aborted test')).toBe(false);
  });
  it('clears personal contacts with other records and retains settings', async () => {
    await db.addPersonalContact({name:'Contact test',phone:'',relationship:''});
    await db.saveSettings({ownerName:'Owner test'});
    await db.clearAllData();
    expect(await db.getPersonalContacts()).toEqual([]);
    expect((await db.getSettings()).ownerName).toBe('Owner test');
  });
  it('uses the local calendar date', () => { expect(localDate(new Date(2026, 9, 31, 0, 5))).toBe('2026-10-31'); });
});
