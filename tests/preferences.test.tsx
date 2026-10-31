// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import { i18n } from '../src/services/i18n';
import { db } from '../src/services/db';

Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false, addListener() {}, removeListener() {} }) });

beforeEach(async () => {
  localStorage.clear();
  i18n.setLanguage('en');
  await db.init();
  await db.saveSettings({ theme: 'dark' });
});
afterEach(() => cleanup());

async function openApp() {
  const result = render(<App />);
  await screen.findByTitle(/Open Menu Drawer|मेनू खोलें/, {}, { timeout: 4000 });
  return result;
}

function openSettings() {
  fireEvent.click(screen.getByTitle(/Open Menu Drawer|मेनू खोलें/));
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
}

describe('app preferences', () => {
  it('switches language from the header and settings during the session', async () => {
    await openApp();
    fireEvent.click(screen.getByTitle('Select App Language'));
    fireEvent.click(screen.getByRole('button', { name: /हिन्दी Hindi/ }));
    expect(document.documentElement.lang).toBe('hi');
    expect(screen.getByText('होम')).toBeTruthy();
    fireEvent.click(screen.getByTitle(/Open Menu Drawer|मेनू खोलें/));
    expect(screen.getByRole('button', { name: 'सेटिंग्स' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'सेटिंग्स' }));
    expect(screen.getByText('सेटिंग्स एवं गोपनीयता')).toBeTruthy();
    expect(screen.getByText('ऐप की भाषा')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'हिंदी' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByText('Settings & Privacy')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('does not expose backup or restore in the sidebar or settings', async () => {
    const before = await db.getSettings();
    await openApp();
    fireEvent.click(screen.getByTitle('Open Menu Drawer'));
    const menu = screen.getByRole('dialog', { name: 'Main menu' });
    expect(within(menu).queryByText(/backup|restore/i)).toBeNull();
    fireEvent.click(within(menu).getByRole('button', { name: 'Settings' }));
    expect(screen.queryByText(/backup|restore/i)).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    const after = await db.getSettings();
    expect(after.ownerName).toBe(before.ownerName);
    expect(after.ownerPhone).toBe(before.ownerPhone);
  });

  it('defaults to dark for fresh settings and does not expose the removed lock', async () => {
    // Delete only the settings record in the isolated fake IndexedDB instance.
    const connection = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('GopalAI_Assistant_DB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = connection.transaction('app_settings', 'readwrite');
      transaction.objectStore('app_settings').delete('config');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    connection.close();
    expect((await db.getSettings()).theme).toBe('dark');
    await db.init();
    expect((await db.getSettings()).theme).toBe('dark');
    // Old backups can still contain legacy PIN fields, but they cannot reactivate the lock.
    await db.saveSettings({ pinEnabled: true, pinHash: '8675', biometricEnabled: true });
    await openApp();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.queryByTitle('Lock Security Access')).toBeNull();
    openSettings();
    expect(screen.queryByText(/security pin lock/i)).toBeNull();
    expect(screen.queryByText(/biometric/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /update pin/i })).toBeNull();
  });

  it('switches themes from both controls, applies them to views and persists the setting', async () => {
    await openApp();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    fireEvent.click(screen.getByTitle('Switch theme'));
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(false));
    await waitFor(async () => expect((await db.getSettings()).theme).toBe('light'));
    openSettings();
    expect(screen.getByText('Current theme: Light mode')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Switch theme' })[1]);
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
    await waitFor(async () => expect((await db.getSettings()).theme).toBe('dark'));
    expect(screen.getByText('Current theme: Dark mode')).toBeTruthy();
    fireEvent.click(screen.getByTitle(/Open Menu Drawer|मेनू खोलें/));
    fireEvent.click(screen.getByRole('button', { name: /Gopal Caterers Orders/ }));
    const empty = await screen.findByText('No catering orders found');
    expect(empty.className).toContain('dark:text-slate-300');
    expect(empty.parentElement?.className).toContain('dark:bg-slate-900/60');
  });

  it('uses theme-aware language controls and report chart surfaces', async () => {
    await openApp();
    const languageButton = screen.getByTitle('Select App Language');
    expect(document.querySelector('.app-shell')?.getAttribute('data-theme')).toBe('dark');
    expect(document.querySelector('.workspace-hero')).toBeTruthy();
    expect(languageButton.className).toContain('language-trigger');
    expect(languageButton.className).toContain('bg-white dark:bg-slate-950/90');
    fireEvent.click(languageButton);
    const hindi = screen.getByRole('button', { name: /हिन्दी Hindi/ });
    const english = screen.getByRole('button', { name: /English English/ });
    expect(hindi.getAttribute('aria-pressed')).toBe('false');
    expect(english.getAttribute('aria-pressed')).toBe('true');
    expect(hindi.className).toContain('bg-slate-50 dark:bg-slate-900/60');
    expect(hindi.parentElement?.parentElement?.className).toContain('bg-white/95 dark:bg-slate-950/95');
    fireEvent.click(languageButton);
    fireEvent.click(screen.getByTitle('Switch theme'));
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(false));
    expect(document.querySelector('.app-shell')?.getAttribute('data-theme')).toBe('light');
    fireEvent.click(screen.getByTitle('Open Menu Drawer'));
    fireEvent.click(screen.getByRole('button', { name: /Reports & Analytics/ }));
    await screen.findByRole('heading', { name: 'Analytics & Reports Dashboard' });
    fireEvent.click(screen.getByRole('button', { name: 'Consolidated (All Businesses)' }));
    const charts = document.querySelectorAll('.chart-theme');
    expect(charts.length).toBe(6);
    for (const chart of charts) {
      expect(chart.className).toContain('dark:');
      expect(chart.className).toMatch(/bg-white|to-white/);
    }
    fireEvent.click(screen.getByTitle('Switch theme'));
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
    expect(document.querySelectorAll('.chart-theme').length).toBe(6);
    expect(document.querySelector('.app-shell')?.getAttribute('data-theme')).toBe('dark');
  });

  it('keeps workspace dashboards and module navigation in sync with their own data', async () => {
    await db.addSale({ businessId: 'jain-sweets', amount: 1111, date: '2026-10-30', paymentMethod: 'cash', items: [] });
    await db.addSale({ businessId: 'kesarwadi', amount: 2222, date: '2026-10-30', paymentMethod: 'cash', items: [] });
    await db.addPersonalTransaction({ type: 'income', amount: 3333, category: 'Test salary', date: '2026-10-30', paymentMethod: 'bank' });
    await db.addCateringOrder({ customerName: 'Test event', customerPhone: '', eventType: 'wedding', eventDate: '2026-12-01', venue: 'Hall', guestCount: 100, menuItems: [], totalAmount: 5000, advanceAmount: 0, transportRequired: false, equipmentRequired: false, status: 'confirmed', requiredCooks: 1, requiredHelpers: 1, requiredWaiters: 1, requiredSupervisors: 1, requiredCleaners: 1, requiredDrivers: 0, assignedStaffIds: [] });
    await db.addCateringOrder({ customerName: 'Cancelled event', customerPhone: '', eventType: 'wedding', eventDate: '2026-12-02', venue: 'Hall', guestCount: 100, menuItems: [], totalAmount: 99000, advanceAmount: 0, transportRequired: false, equipmentRequired: false, status: 'cancelled', requiredCooks: 1, requiredHelpers: 1, requiredWaiters: 1, requiredSupervisors: 1, requiredCleaners: 1, requiredDrivers: 0, assignedStaffIds: [] });
    const app = await openApp();
    const tabs = screen.getByRole('navigation', { name: 'Choose workspace' });
    await waitFor(() => expect(document.querySelector('.metric-grid')?.textContent).toContain('1,111'));
    fireEvent.click(within(tabs).getByRole('button', { name: 'Kesarwadi Canteen' }));
    await waitFor(() => expect(document.querySelector('.metric-grid')?.textContent).toContain('2,222'));
    expect(document.querySelector('.metric-grid')?.textContent).not.toContain('1,111');
    expect(localStorage.getItem('gopalai-workspace')).toBe('kesarwadi');
    fireEvent.click(screen.getByRole('button', { name: /Add Sale/ }));
    expect(await screen.findByRole('heading', { name: 'Sales Management' })).toBeTruthy();
    expect(within(document.querySelector('header')!).getByText('Kesarwadi Canteen')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Choose workspace' })).getByRole('button', { name: 'Personal' }));
    await waitFor(() => expect(document.querySelector('.metric-grid')?.textContent).toContain('3,333'));
    expect(document.querySelector('.metric-grid')?.textContent).not.toContain('2,222');
    expect(screen.getByText('Net balance')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Choose workspace' })).getByRole('button', { name: 'Gopal Caterers' }));
    expect(await screen.findByText('Order value')).toBeTruthy();
    await waitFor(() => expect(document.querySelector('.metric-grid')?.textContent).toContain('5,000'));
    expect(document.querySelector('.metric-grid')?.textContent).not.toContain('99,000');
    expect(document.querySelector('.metric-grid')?.textContent).not.toContain('3,333');
    expect(screen.getByText('Test event')).toBeTruthy();
    expect(screen.queryByText('Cancelled event')).toBeNull();
    app.unmount();
    await openApp();
    expect(screen.getByRole('button', { name: 'Gopal Caterers', pressed: true })).toBeTruthy();
  });

  it('starts dark and English after a reload while handling rapid theme changes', async () => {
    const app = await openApp();
    fireEvent.click(screen.getByTitle('Switch theme'));
    fireEvent.click(screen.getByTitle('Switch theme'));
    fireEvent.click(screen.getByTitle('Switch theme'));
    await waitFor(async () => expect((await db.getSettings()).theme).toBe('light'));
    fireEvent.click(screen.getByTitle('Select App Language'));
    fireEvent.click(screen.getByRole('button', { name: /हिन्दी Hindi/ }));
    app.unmount();
    await openApp();
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));
    expect(document.querySelector('.app-shell')?.getAttribute('data-theme')).toBe('dark');
    await waitFor(async () => expect((await db.getSettings()).theme).toBe('dark'));
    expect(document.documentElement.lang).toBe('hi');
    expect(screen.getByText('होम')).toBeTruthy();
    // A previous stored language must not override the English launch default.
    localStorage.setItem('gopalai-language', 'hi');
    vi.resetModules();
    const reloaded = await import('../src/services/i18n');
    expect(reloaded.i18n.getLanguage()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('can navigate the main screens in Hindi while light mode is selected', async () => {
    await openApp();
    fireEvent.click(screen.getByTitle('Switch theme'));
    fireEvent.click(screen.getByTitle('Select App Language'));
    fireEvent.click(screen.getByRole('button', { name: /हिन्दी Hindi/ }));
    const sections = [
      ['AI असिस्टेंट (वॉयस)', 'AI कमांड सेंटर'],
      ['व्यक्तिगत', 'व्यक्तिगत'],
      ['कार्य और रिमाइंडर', 'कार्य, रिमाइंडर एवं नोट्स'],
      ['बिक्री प्रबंधन (Sales)', 'बिक्री प्रबंधन (Sales)'],
      ['खर्च प्रबंधन', 'खर्चा प्रबंधन (Expenses)'],
      ['खरीद और स्टॉक', 'स्टॉक खरीद एवं इनवर्ड'],
      ['इन्वेंट्री प्रबंधन', 'इन्वेंट्री एवं स्टॉक ट्रैकिंग'],
      ['सप्लायर और खाता', 'सप्लायर खाते और विक्रेता खाता'],
      ['भुगतान और बकाया', 'भुगतान प्रबंधन और उधार खाता'],
      ['स्टाफ और वेतन', 'कार्यबल और स्टाफ प्रबंधन'],
      ['गोपाल कैटरर्स ऑर्डर', 'गोपाल कैटरर्स — ऑर्डर और स्टाफ आवंटन'],
      ['रिपोर्ट और विश्लेषण', 'विश्लेषण और रिपोर्ट डैशबोर्ड'],
      ['सूचनाएं और अलर्ट', 'गोपाल AI अलर्ट और सूचनाएं'],
      ['सेटिंग्स', 'सेटिंग्स एवं गोपनीयता']
    ];
    for (const [link, heading] of sections) {
      fireEvent.click(screen.getByTitle(/Open Menu Drawer|मेनू खोलें/));
      const drawerPanel = document.querySelector('.fixed.inset-0.z-50.flex') as HTMLElement;
      const nav = within(drawerPanel).getByRole('navigation', { name: 'नेविगेशन' });
      const drawer = within(nav).getByText(link).closest('button')!;
      fireEvent.click(drawer);
      await screen.findByRole('heading', { name: heading });
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.lang).toBe('hi');
    }
  });


  it('translates a staff form without changing saved option values or user text', async () => {
    await openApp();
    fireEvent.click(screen.getByTitle('Switch theme'));
    fireEvent.click(screen.getByTitle('Select App Language'));
    fireEvent.click(screen.getByRole('button', { name: /हिन्दी Hindi/ }));
    fireEvent.click(screen.getByTitle(/Open Menu Drawer|मेनू खोलें/));
    fireEvent.click(screen.getByText('स्टाफ और वेतन').closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: 'स्टाफ जोड़ें' }));
    expect(screen.getByText('नया कर्मचारी प्रोफाइल बनाएं')).toBeTruthy();
    const name = screen.getByPlaceholderText('जैसे रमेश कुमार') as HTMLInputElement;
    const form = name.closest('form')!;
    expect(form.className).toContain('bg-white dark:bg-slate-900');
    expect(name.className).toContain('text-slate-900 dark:text-white');
    fireEvent.change(name, { target: { value: 'Test Employee' } });
    fireEvent.change(within(form).getByPlaceholderText('जैसे रसोइया / सहायक / कैशियर'), { target: { value: 'Helper' } });
    fireEvent.change(within(form).getByPlaceholderText('जैसे 18000'), { target: { value: '18000' } });
    act(() => i18n.setLanguage('en'));
    expect(name.value).toBe('Test Employee');
    expect(within(form).getByText('Register New Employee Profile')).toBeTruthy();
    act(() => i18n.setLanguage('hi'));
    expect(name.value).toBe('Test Employee');
    const kitchen = within(form).getByRole('option', { name: 'रसोई' }) as HTMLOptionElement;
    expect(kitchen.value).toBe('Kitchen');
    const department = kitchen.closest('select')!;
    fireEvent.change(department, { target: { value: 'Service' } });
    const morning = within(form).getByRole('option', { name: 'सुबह' }) as HTMLOptionElement;
    expect(morning.value).toBe('Morning');
    fireEvent.change(morning.closest('select')!, { target: { value: 'Morning' } });
    fireEvent.click(within(form).getByRole('button', { name: 'कर्मचारी सहेजें' }));
    await waitFor(async () => {
      const staff = (await db.getStaff()).find(x => x.name === 'Test Employee');
      expect(staff?.department).toBe('Service');
      expect(staff?.shift).toBe('Morning');
    });
  });

  it('removes expenses and notifies subscribers', async () => {
    const expense = await db.addExpense({ businessId: 'jain-sweets', amount: 50,
      category: 'other', date: '2026-10-31', paymentMethod: 'cash' });
    const listener = vi.fn();
    const unsubscribe = db.subscribe(listener);
    await db.deleteExpense(expense.id);
    expect((await db.getExpenses()).some(e => e.id === expense.id)).toBe(false);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });


  it('localizes interactive filters without changing their underlying values', async () => {
    await openApp();
    fireEvent.click(screen.getByTitle('Select App Language'));
    fireEvent.click(screen.getByRole('button', { name: /हिन्दी Hindi/ }));
    fireEvent.click(screen.getByTitle('मेनू खोलें'));
    fireEvent.click(within(document.querySelector('.fixed.inset-0.z-50.flex') as HTMLElement).getByText('इन्वेंट्री प्रबंधन'));
    fireEvent.click(screen.getByRole('button', { name: /स्टॉक गतिविधि/ }));
    expect(screen.getByText('अभी स्टॉक गतिविधि का कोई रिकॉर्ड नहीं है')).toBeTruthy();
    fireEvent.click(screen.getByTitle('मेनू खोलें'));
    fireEvent.click(within(document.querySelector('.fixed.inset-0.z-50.flex') as HTMLElement).getByText('सूचनाएं और अलर्ट'));
    fireEvent.click(screen.getByRole('button', { name: 'अपठित' }));
    expect(screen.getByText('सभी सिस्टम चालू हैं')).toBeTruthy();
  });

});

describe('navigation history', () => {
  it('returns to the previous screen and workspace without creating back loops', async () => {
    await openApp();
    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sales' }));
    expect(await screen.findByRole('heading', { name: 'Sales Management' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Go back' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Stock' }));
    expect(await screen.findByRole('heading', { name: 'Inventory & Stock Tracking' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(await screen.findByRole('heading', { name: 'Sales Management' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(screen.getByRole('navigation', { name: 'Choose workspace' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Choose workspace' })).getByRole('button', { name: 'Kesarwadi Canteen' }));
    expect(localStorage.getItem('gopalai-workspace')).toBe('kesarwadi');
    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sales' }));
    expect(await screen.findByRole('heading', { name: 'Sales Management' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(localStorage.getItem('gopalai-workspace')).toBe('kesarwadi');
    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
    fireEvent.click(screen.getByTitle('Open Menu Drawer'));
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Navigation' })).getByRole('button', { name: 'Personal' }));
    expect(await screen.findByRole('heading', { name: /^Personal$/ })).toBeTruthy();
    expect(localStorage.getItem('gopalai-workspace')).toBe('personal');
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(localStorage.getItem('gopalai-workspace')).toBe('kesarwadi');
    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
  });
});
