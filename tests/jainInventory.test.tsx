// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { JAIN_SWEETS_INVENTORY } from '../src/data/jainSweetsInventory';
import { db } from '../src/services/db';
import { isLowStock } from '../src/services/inventory';
import { displayProductName, getHindiProductName, matchesProductName } from '../src/services/productNames';
import { InventoryView } from '../src/views/InventoryView';
import { i18n } from '../src/services/i18n';

beforeAll(async () => {
  // Simulate an older local database containing an existing named product.
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('GopalAI_Assistant_DB', 1);
    request.onupgradeneeded = () => {
      const inventory = request.result.createObjectStore('inventory_items', { keyPath: 'id' });
      request.result.createObjectStore('app_settings', { keyPath: 'key' });
      inventory.add({ id: 'existing-peda', businessId: 'jain-sweets', name: '  PEDa  ', category: 'Existing category', stockQuantity: 17, unit: 'kg', minStockLevel: 4, lastUpdated: '2026-01-01' });
      inventory.add({ id: 'other-chivda', businessId: 'kesarwadi', name: 'Chivda', category: 'Other', stockQuantity: 8, unit: 'pcs', minStockLevel: 1, lastUpdated: '2026-01-01' });
      inventory.add({ id: 'existing-paan-peda', businessId: 'paan-bai', name: ' PEDA ', category: 'Existing category', stockQuantity: 12, unit: 'kg', minStockLevel: 3, lastUpdated: '2026-01-01' });
      inventory.add({ id: 'gopal-original', businessId: 'gopal-caterers', name: 'Rice', category: 'Other', stockQuantity: 9, unit: 'kg', minStockLevel: 1, lastUpdated: '2026-01-01' });
    };
    request.onsuccess = () => { request.result.close(); resolve(); };
    request.onerror = () => reject(request.error);
  });
});

describe('Jain Sweets inventory import', () => {
  it('imports each unique menu name once, preserving existing stock and other workspaces', async () => {
    await Promise.all([db.init(), db.init()]);
    const products = await db.getInventory('jain-sweets');
    expect(JAIN_SWEETS_INVENTORY).toHaveLength(49);
    expect(new Set(JAIN_SWEETS_INVENTORY.map(item => item.name.toLowerCase())).size).toBe(49);
    expect(products).toHaveLength(49);
    const existing = products.find(item => item.id === 'existing-peda')!;
    expect(existing.stockQuantity).toBe(17);
    expect(existing.unit).toBe('kg');
    expect(existing.category).toBe('Existing category');
    for (const product of JAIN_SWEETS_INVENTORY.filter(item => item.name !== 'Peda')) {
      const record = products.find(item => item.name === product.name)!;
      expect(record.category).toBe(product.category);
      expect(record.stockQuantity).toBe(0);
      expect(record.unit).toBe('');
      expect(record.reorderAlertEnabled).toBe(false);
      expect(isLowStock(record)).toBe(false);
      expect(record).not.toHaveProperty('price');
      expect(record).not.toHaveProperty('description');
    }
    for (const [businessId, existingName, existingId, stock] of [
      ['kesarwadi', 'Chivda', 'other-chivda', 8],
      ['paan-bai', 'Peda', 'existing-paan-peda', 12]
    ] as const) {
      const canteen = await db.getInventory(businessId);
      expect(canteen).toHaveLength(49);
      expect(canteen.find(item => item.id === existingId)?.stockQuantity).toBe(stock);
      for (const product of JAIN_SWEETS_INVENTORY.filter(item => item.name !== existingName)) {
        const record = canteen.find(item => item.name === product.name)!;
        expect(record.businessId).toBe(businessId);
        expect(record.category).toBe(product.category);
        expect(record.stockQuantity).toBe(0);
        expect(record.unit).toBe('');
        expect(record.reorderAlertEnabled).toBe(false);
        expect(record).not.toHaveProperty('price');
      }
    }
    expect(await db.getInventory('gopal-caterers')).toHaveLength(1);
    await db.init();
    expect(await db.getInventory('jain-sweets')).toHaveLength(49);
    expect(await db.getInventory('kesarwadi')).toHaveLength(49);
    expect(await db.getInventory('paan-bai')).toHaveLength(49);
  });

  it('switches catalogue names and searches in either language without changing saved names', async () => {
    for (const product of JAIN_SWEETS_INVENTORY) {
      expect(getHindiProductName(product.name)).not.toBe(product.name);
      expect(matchesProductName(product.name, getHindiProductName(product.name))).toBe(true);
    }
    expect(getHindiProductName('My custom item')).toBe('My custom item');
    i18n.setLanguage('en');
    render(<InventoryView currentBusinessId="kesarwadi" />);
    expect(await screen.findByText('Mohanthal')).toBeTruthy();
    act(() => i18n.setLanguage('hi'));
    expect(screen.getByText('मोहनथाल')).toBeTruthy();
    expect(screen.queryByText('Mohanthal')).toBeNull();
    const search = screen.getByPlaceholderText('नाम, श्रेणी या व्यापार से स्टॉक खोजें...');
    fireEvent.change(search, { target: { value: 'mohanthal' } });
    expect(screen.getByText('मोहनथाल')).toBeTruthy();
    fireEvent.change(search, { target: { value: 'मोहनथाल' } });
    expect(screen.getByText('मोहनथाल')).toBeTruthy();
    const item = (await db.getInventory('kesarwadi')).find(x => x.name === 'Mohanthal')!;
    fireEvent.change(search, { target: { value: '' } });
    const card = screen.getByText('मोहनथाल').closest('.space-y-3') as HTMLElement;
    fireEvent.click(within(card).getByTitle('आइटम बदलें'));
    expect(screen.getByDisplayValue('मोहनथाल')).toBeTruthy();
    const form = screen.getByDisplayValue('मोहनथाल').closest('form')!;
    fireEvent.submit(form);
    await waitFor(() => expect(screen.queryByDisplayValue('मोहनथाल')).toBeNull());
    expect((await db.getInventory('kesarwadi')).find(x => x.id === item.id)?.name).toBe('Mohanthal');
    act(() => i18n.setLanguage('en'));
    expect(displayProductName('Mohanthal')).toBe('Mohanthal');
    expect(screen.getByText('Mohanthal')).toBeTruthy();
    cleanup();
  });

  it('allows filtering, setting a unit and reorder level, and does not recreate deleted items', async () => {
    i18n.setLanguage('en');
    render(<InventoryView currentBusinessId="jain-sweets" />);
    expect(await screen.findByText('Fafda')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Farsan' } });
    expect(screen.queryByText('Mohanthal')).toBeNull();
    expect(screen.getByText('Fafda')).toBeTruthy();
    const card = screen.getByText('Fafda').closest('.space-y-3') as HTMLElement;
    fireEvent.click(within(card).getByTitle('Edit Item'));
    const form = screen.getByText('Edit Stock Item').closest('form')!;
    const unit = within(form).getByRole('combobox', { name: 'Unit' });
    // The unit select has an explicit unset option; no assumed unit is saved.
    expect(within(form).getByRole('option', { name: 'Not set' })).toBeTruthy();
    expect(within(form).getByRole('option', { name: 'Farsan' })).toBeTruthy();
    fireEvent.change(unit, { target: { value: 'kg' } });
    fireEvent.change(within(form).getByLabelText('Reorder Level Alert (Optional)'), { target: { value: '2' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Update Item' }));
    await waitFor(() => expect(screen.queryByText('Edit Stock Item')).toBeNull());
    const fafda = (await db.getInventory('jain-sweets')).find(item => item.name === 'Fafda')!;
    expect(fafda.unit).toBe('kg');
    expect(isLowStock(fafda)).toBe(true);
    cleanup();
    await db.deleteInventoryItem(fafda.id);
    await db.init();
    expect((await db.getInventory('jain-sweets')).some(item => item.name === 'Fafda')).toBe(false);
    const kesarFafda = (await db.getInventory('kesarwadi')).find(item => item.name === 'Fafda')!;
    await db.deleteInventoryItem(kesarFafda.id);
    await db.init();
    expect((await db.getInventory('kesarwadi')).some(item => item.name === 'Fafda')).toBe(false);
    expect((await db.getInventory('paan-bai')).some(item => item.name === 'Fafda')).toBe(true);
  });
});
