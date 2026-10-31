import { BUSINESSES } from '../types/database';
import type { ParsedAgentResult } from './aiAgent';

// Only these read-only actions can run without an owner confirmation.
const readOnly = new Set(['QUERY_STAFF_COUNT', 'QUERY_STAFF_SHORTAGE', 'UNKNOWN_QUERY']);
const supported = new Set([...readOnly, 'ADD_SALE', 'ADD_EXPENSE', 'ADD_REMINDER', 'ADD_PERSONAL_TRANSACTION', 'CALL_CONTACT', 'OPEN_APP', 'SEARCH_WEB', 'OPEN_MAPS']);
const methods: Record<string, string[]> = {
  ADD_SALE: ['cash', 'upi', 'online', 'credit'],
  ADD_EXPENSE: ['cash', 'upi', 'bank', 'credit'],
  ADD_PERSONAL_TRANSACTION: ['cash', 'upi', 'bank', 'card']
};
const categories = ['raw_materials', 'electricity', 'rent', 'staff_salary', 'transportation', 'packaging', 'maintenance', 'other'];

export function requiresAgentConfirmation(action: string): boolean {
  return !readOnly.has(action);
}

export function isProgrammingRequest(prompt: string): boolean {
  return /\b(?:python|java(?:script)?|sql|dsa|programming|coding|debug(?:ging)?|leetcode|code\s+interview)\b|\bc\+\+(?!\w)/i.test(prompt);
}

export function agentValidationError(result: ParsedAgentResult): string | null {
  if (!result || typeof result.action !== 'string' || !supported.has(result.action)) {
    return 'This action is not available through the assistant yet. Please use the relevant app screen; no action was taken.';
  }
  if (result.business_id && !Object.prototype.hasOwnProperty.call(BUSINESSES, result.business_id)) return 'Please choose a valid workspace.';
  const p = result.parameters || {};
  if (['ADD_SALE', 'ADD_EXPENSE', 'ADD_PERSONAL_TRANSACTION'].includes(result.action)) {
    if (!Number.isFinite(p.amount) || (p.amount as number) <= 0) return 'Please specify a valid amount greater than zero.';
    if (!p.date || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || Number.isNaN(Date.parse(`${p.date}T00:00:00Z`)) || new Date(`${p.date}T00:00:00Z`).toISOString().slice(0, 10) !== p.date) return 'Please specify the transaction date in YYYY-MM-DD format.';
    if (!p.payment_method || !methods[result.action].includes(p.payment_method)) return 'Please specify a supported payment method.';
    if (result.action !== 'ADD_PERSONAL_TRANSACTION' && (!result.business_id || result.business_id === 'personal')) return 'Please choose the business workspace for this transaction.';
    if (result.action === 'ADD_SALE' && (p.item_name || p.quantity || p.unit)) return 'Please enter itemized sales in Sales Management so item details and stock can be checked.';
    if (result.action === 'ADD_EXPENSE' && (!p.category || !categories.includes(p.category))) return 'Please specify the expense category.';
    if (result.action === 'ADD_PERSONAL_TRANSACTION' && (!p.category?.trim() || !['income', 'expense'].includes(p.transaction_type || ''))) return 'Please specify whether this is income or expense and provide a category.';
  }
  if (result.action === 'ADD_REMINDER' && (!p.reminder_title?.trim() || !p.reminder_time || Number.isNaN(Date.parse(p.reminder_time)))) return 'Please specify the reminder title and a valid date and time.';
  if (result.action === 'CALL_CONTACT' && !/^\+?[0-9]{7,15}$/.test((p.phone_number || '').replace(/[\s()-]/g, ''))) return 'Please provide the phone number. Contact lookup is not connected.';
  if (result.action === 'OPEN_APP' && !p.app_name?.trim()) return 'Please specify the app to open.';
  if (result.action === 'SEARCH_WEB' && !p.query?.trim()) return 'Please specify what to search for.';
  if (result.action === 'OPEN_MAPS' && !p.location?.trim()) return 'Please specify the location.';
  if (['QUERY_STAFF_COUNT', 'QUERY_STAFF_SHORTAGE'].includes(result.action) && (!result.business_id || result.business_id === 'personal')) return 'Please choose a business workspace for this staff query.';
  return null;
}
