// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { db } from '../src/services/db';
import { i18n } from '../src/services/i18n';
import { PersonalFinanceView } from '../src/views/PersonalFinanceView';
import { TasksRemindersView } from '../src/views/TasksRemindersView';

beforeEach(async () => { i18n.setLanguage('en'); await db.init(); });
afterEach(cleanup);

it('opens Personal on tasks and keeps personal tasks and reminders separate from business records', async () => {
  await db.addTask({ title: 'Personal test task', businessId: 'personal', priority: 'medium' });
  await db.addTask({ title: 'Business test task', businessId: 'jain-sweets', priority: 'medium' });
  await db.addReminder({ title: 'Personal test reminder', businessId: 'personal', dateTime: '2030-01-01T12:00', priority: 'medium' });
  await db.addReminder({ title: 'Business test reminder', businessId: 'jain-sweets', dateTime: '2030-01-01T12:00', priority: 'medium' });
  render(<PersonalFinanceView />);
  expect(screen.queryByText('Personal assistant tools')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Translate messages' })).toBeNull();
  expect(await screen.findByText('Personal test task')).toBeTruthy();
  expect(screen.queryByText('Business test task')).toBeNull();
  expect(screen.getByText('Personal test reminder')).toBeTruthy();
  expect(screen.queryByText('Business test reminder')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));
  fireEvent.change(screen.getByPlaceholderText('e.g. Pay electricity bill, Renew insurance...'), { target: { value: 'A new personal task' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Task' }));
  await waitFor(async () => expect((await db.getTasks()).find(task => task.title === 'A new personal task')?.businessId).toBe('personal'));
  expect(await screen.findByText('A new personal task')).toBeTruthy();
});

it('defaults the task and reminder forms to the current personal workspace', async () => {
  render(<TasksRemindersView currentBusinessId="personal" />);
  await screen.findByText('Personal test task');
  expect(screen.queryByText('Business test task')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));
  const modal = screen.getByText('Create New Task').closest('div.fixed')!;
  const select = within(modal as HTMLElement).getAllByRole('combobox')[0] as HTMLSelectElement;
  expect(select.value).toBe('personal');
  fireEvent.change(within(modal as HTMLElement).getByPlaceholderText('e.g. Reorder packaging boxes'), { target: { value: 'Personal task via tasks page' } });
  fireEvent.click(within(modal as HTMLElement).getByRole('button', { name: 'Save Task' }));
  await waitFor(async () => expect((await db.getTasks()).find(task => task.title === 'Personal task via tasks page')?.businessId).toBe('personal'));
  fireEvent.click(screen.getByRole('button', { name: 'Reminders' }));
  const reminderSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
  expect(reminderSelect.value).toBe('personal');
  expect(screen.getByText('Personal test reminder')).toBeTruthy();
  expect(screen.queryByText('Business test reminder')).toBeNull();
});
