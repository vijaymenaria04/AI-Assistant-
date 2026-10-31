import type { BusinessId } from '../types/database';
import type { ParsedAgentResult } from './aiAgent';

/** Limited, offline-safe parser: never fills in missing transaction details. */
export function parseLocalCommand(prompt: string, currentBusinessId: BusinessId): ParsedAgentResult {
  const lower = prompt.toLowerCase();
  const hi = /[\u0900-\u097f]/.test(prompt);
  const text = (en: string, hindi: string) => hi ? hindi : en;
  let business: BusinessId = currentBusinessId;
  if (/jain|जैन/.test(lower)) business = 'jain-sweets';
  else if (/paan|pan bai|पान बाई/.test(lower)) business = 'paan-bai';
  else if (/kesar|केसरवाड़ी|केसरवाड़ी/.test(lower)) business = 'kesarwadi';
  else if (/gopal cater|caterer|गोपाल कैटर/.test(lower)) business = 'gopal-caterers';
  else if (/personal|व्यक्तिगत/.test(lower)) business = 'personal';

  const isoDate = lower.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  const today = /\b(today|aaj|aj)\b|आज/.test(lower);
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const date = isoDate || (today ? localDate : undefined);
  const withoutDate = lower.replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');
  const number = '(\\d+(?:\\.\\d{1,2})?)';
  const amountMatch = withoutDate.match(new RegExp(`(?:₹|rs\\.?|inr|rupees?|रु(?:पये)?)\\s*${number}`, 'i'))
    || withoutDate.match(new RegExp(`${number}\\s*(?:₹|rs\\.?|rupees?|rupaye|रुपये|रु\\b)`, 'i'))
    || withoutDate.match(new RegExp(`${number}\\s+(?:sale|sales|bikri|expense|kharch|बिक्री|खर्च)`, 'i'));
  const amount = amountMatch ? Number(amountMatch[1]) : undefined;
  const method = /\bupi\b|यूपीआई/.test(lower) ? 'upi' : /\bcash\b|नकद/.test(lower) ? 'cash' : /\bbank\b|बैंक/.test(lower) ? 'bank' : /\bcredit\b|उधार/.test(lower) ? 'credit' : undefined;
  const category = /\brent\b|किराया/.test(lower) ? 'rent' : /\belectricity\b|बिजली/.test(lower) ? 'electricity' : /\btransport(?:ation)?\b|परिवहन/.test(lower) ? 'transportation' : /\bpackaging\b|पैकेजिंग/.test(lower) ? 'packaging' : /\bmaintenance\b|रखरखाव/.test(lower) ? 'maintenance' : /\bother\b|अन्य/.test(lower) ? 'other' : undefined;
  const base = { business_id: business, requires_owner_confirmation: true, parameters: { amount, date, payment_method: method, category } };
  if (/\bsales?\b|\bbecha\b|\bbikri\b|बिक्री/.test(lower)) return { ...base, action: 'ADD_SALE', speech_response: text('Please review the sale before saving.', 'बिक्री सहेजने से पहले जाँचें।') };
  if (/\bexpense\b|\bkharch\b|खर्च/.test(lower)) {
    if (business === 'personal') return { ...base, action: 'ADD_PERSONAL_TRANSACTION', parameters: { ...base.parameters, transaction_type: 'expense', category: category }, speech_response: text('Please review the personal expense.', 'व्यक्तिगत खर्च की जाँचें।') };
    return { ...base, action: 'ADD_EXPENSE', speech_response: text('Please review the expense before saving.', 'खर्च सहेजने से पहले जाँचें।') };
  }
  if ((/staff|स्टाफ/.test(lower)) && (/count|kitne|कितने/.test(lower))) return { action: 'QUERY_STAFF_COUNT', business_id: business, requires_owner_confirmation: false, speech_response: '', parameters: {} };
  return { action: 'UNKNOWN_QUERY', business_id: business, requires_owner_confirmation: false, speech_response: text('I could not understand that request. Please provide more details.', 'यह अनुरोध समझ नहीं आया। कृपया और जानकारी दें।'), parameters: {} };
}
