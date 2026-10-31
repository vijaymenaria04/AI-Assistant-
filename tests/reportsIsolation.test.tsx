// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { db } from '../src/services/db';
import { ReportsView } from '../src/views/ReportsView';
import { i18n } from '../src/services/i18n';

beforeEach(async () => { i18n.setLanguage('en'); await db.init(); });
afterEach(cleanup);
it('does not include other workspaces in supplier or staff totals', async () => {
  await db.addPurchase({businessId:'jain-sweets',itemName:'Isolation report j',quantity:1,unit:'pcs',amount:77,supplierName:'Report supplier j',date:'2026-10-31',paidAmount:0});
  await db.addPurchase({businessId:'paan-bai',itemName:'Isolation report p',quantity:1,unit:'pcs',amount:999,supplierName:'Report supplier p',date:'2026-10-31',paidAmount:0});
  await db.addStaff({businessId:'jain-sweets',assignedLocation:'jain-sweets',name:'Staff J',role:'Helper',phone:'',salaryAmount:0,salaryCycle:'daily',dateJoined:'2026-10-31'});
  await db.addStaff({businessId:'paan-bai',assignedLocation:'paan-bai',name:'Staff P',role:'Helper',phone:'',salaryAmount:0,salaryCycle:'daily',dateJoined:'2026-10-31'});
  render(<ReportsView currentBusinessId="jain-sweets" />);
  await waitFor(() => expect(screen.getByText('₹77')).toBeTruthy());
  expect(screen.queryByText('₹999')).toBeNull();
});

it('limits the local top-sales lookup to the selected report workspace', async () => {
  await db.addSale({businessId:'jain-sweets',amount:123,date:'2026-10-31',paymentMethod:'cash',items:[]});
  await db.addSale({businessId:'paan-bai',amount:999,date:'2026-10-31',paymentMethod:'cash',items:[]});
  render(<ReportsView currentBusinessId="jain-sweets" />);
  await waitFor(() => expect(screen.getAllByText('₹123').length).toBeGreaterThan(0));
  fireEvent.click(screen.getByRole('button',{name:'Which business had the highest sales?'}));
  await waitFor(() => expect(screen.getByText(/Top business in the selected report/).textContent).toContain('Jain Sweets'));
  expect(screen.getByText(/Top business in the selected report/).textContent).not.toContain('Paan');
});

it('keeps report exports but does not show a print button', () => {
  render(<ReportsView currentBusinessId="jain-sweets" />);
  expect(screen.queryByRole('button', { name: /^print$/i })).toBeNull();
  expect(screen.getByRole('button', { name: /PDF Report/i })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Excel/i })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Share/i })).toBeTruthy();
});
