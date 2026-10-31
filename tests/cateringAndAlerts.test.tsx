// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { db } from '../src/services/db';
import { i18n } from '../src/services/i18n';
import { CateringView } from '../src/views/CateringView';
import { NotificationsView } from '../src/views/NotificationsView';

beforeEach(async () => { i18n.setLanguage('en'); await db.init(); });
afterEach(cleanup);
it('starts a catering booking without fabricated menu, guests, venue or status', async () => {
  const {container} = render(<CateringView currentBusinessId="gopal-caterers" />);
  fireEvent.click(screen.getByRole('button', {name:/new catering order/i}));
  expect(screen.queryByDisplayValue('200')).toBeNull();
  expect(screen.queryByDisplayValue('Shahi Paneer')).toBeNull();
  expect(screen.getByDisplayValue('Choose status')).toBeTruthy();
  fireEvent.change(screen.getByPlaceholderText('e.g. Vikram Sharma'), {target:{value:'Real customer'}});
  fireEvent.change(screen.getByPlaceholderText('e.g. +91 9876543210'), {target:{value:'1234567890'}});
  fireEvent.change(screen.getByDisplayValue('Choose event type'), {target:{value:'other'}});
  fireEvent.change(screen.getByDisplayValue('Choose status'), {target:{value:'enquiry'}});
  fireEvent.change(container.querySelector('input[type="date"]')!, {target:{value:'2026-12-01'}});
  fireEvent.change(screen.getByPlaceholderText('e.g. 250'), {target:{value:'20'}});
  fireEvent.change(screen.getByPlaceholderText('e.g. 85000'), {target:{value:'1000'}});
  fireEvent.change(screen.getByPlaceholderText('e.g. 25000'), {target:{value:'0'}});
  fireEvent.click(screen.getByRole('button', {name:/save catering booking/i}));
  await waitFor(async () => expect((await db.getCateringOrders()).some(o => o.customerName === 'Real customer')).toBe(true));
  const booking = (await db.getCateringOrders()).find(o => o.customerName === 'Real customer')!;
  expect(booking.menuItems).toEqual([]); expect(booking.venue).toBe(''); expect(booking.eventTime).toBeUndefined(); expect(booking.status).toBe('enquiry');
});
it('shows task and reminder alerts only for the selected workspace', async () => {
  await db.addTask({title:'Only Jain task',priority:'medium',businessId:'jain-sweets'});
  await db.addTask({title:'Only Paan task',priority:'medium',businessId:'paan-bai'});
  await db.addReminder({title:'Only Jain reminder',businessId:'jain-sweets',dateTime:'2026-12-01T10:00',priority:'high'});
  await db.addReminder({title:'Only Paan reminder',businessId:'paan-bai',dateTime:'2026-12-01T10:00',priority:'high'});
  const {rerender} = render(<NotificationsView currentBusinessId="jain-sweets" />);
  await waitFor(() => expect(screen.getByText(/Only Jain task/)).toBeTruthy());
  expect(screen.queryByText(/Only Paan task/)).toBeNull(); expect(screen.queryByText(/Only Paan reminder/)).toBeNull();
  rerender(<NotificationsView currentBusinessId="paan-bai" />);
  expect(screen.getByText(/Only Paan task/)).toBeTruthy(); expect(screen.queryByText(/Only Jain reminder/)).toBeNull();
});
