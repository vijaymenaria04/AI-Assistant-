// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { aiAgent, type ParsedAgentResult } from '../src/services/aiAgent';
import { db } from '../src/services/db';
import { AIAssistantView } from '../src/views/AIAssistantView';
import { OwnerConfirmModal } from '../src/components/OwnerConfirmModal';
import { i18n } from '../src/services/i18n';

const sale: ParsedAgentResult = {
  action: 'ADD_SALE', business_id: 'kesarwadi', requires_owner_confirmation: false,
  speech_response: 'Record this sale?', parameters: { amount: 234, date: '2026-10-31', payment_method: 'upi' }
};

beforeEach(async () => {
  i18n.setLanguage('en');
  await db.init();
  await db.saveSettings({ ttsEnabled: false });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('agent safety', () => {
  it('requires owner approval even if the model says it is unnecessary; verifies the saved record', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ result: sale }), { headers: { 'content-type': 'application/json' } }));
    const before = await db.getSales('kesarwadi');
    const { result } = await aiAgent.processCommand('Record sale', 'jain-sweets');
    expect(result.requires_owner_confirmation).toBe(true);
    await expect(aiAgent.executeAction(result)).rejects.toThrow(/confirmation/i);
    expect((await db.getSales('kesarwadi')).length).toBe(before.length);
    expect(await aiAgent.executeAction(result, true)).toContain('saved');
    const added = (await db.getSales('kesarwadi')).filter(s => !before.some(old => old.id === s.id));
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ businessId: 'kesarwadi', amount: 234, date: '2026-10-31', paymentMethod: 'upi', items: [] });
  });

  it('does not invent missing fields or execute unsupported payment and programming requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ result: { ...sale, parameters: { amount: 100 } } })));
    const { result } = await aiAgent.processCommand('sale 100');
    expect(result.action).toBe('UNKNOWN_QUERY');
    expect(result.speech_response).toMatch(/date/i);
    const suppliers = await db.getSuppliers('jain-sweets');
    await expect(aiAgent.executeAction({ action: 'PAY_SUPPLIER', business_id: 'jain-sweets', parameters: { amount: 500, supplier_name: 'Unknown' }, requires_owner_confirmation: false, speech_response: 'Paid' }, true)).rejects.toThrow(/not available/i);
    expect(await db.getSuppliers('jain-sweets')).toEqual(suppliers);
    const programming = await aiAgent.processCommand('write Python code');
    expect(programming.result.action).toBe('UNKNOWN_QUERY');
    expect(programming.result.speech_response).toMatch(/not available/i);
    expect((await aiAgent.processCommand('help with C++')).result.speech_response).toMatch(/not available/i);
    await expect(aiAgent.executeAction({ ...sale, parameters: { ...sale.parameters, date: '2026-02-31' } }, true)).rejects.toThrow(/date/i);
  });

  it('uses the offline parser without inventing fields or confusing a date for an amount', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const parsed = await aiAgent.processCommand('Kesarwadi 321 sale on 2026-10-31 UPI');
    expect(parsed.result).toMatchObject({ action: 'ADD_SALE', business_id: 'kesarwadi', requires_owner_confirmation: true, parameters: { amount: 321, date: '2026-10-31', payment_method: 'upi' } });
    const incomplete = await aiAgent.processCommand('sale on 2026-10-31 UPI');
    expect(incomplete.result.action).toBe('UNKNOWN_QUERY');
    expect(incomplete.result.speech_response).toMatch(/amount/i);
  });

  it('routes typed sensitive actions to confirmation instead of writing immediately', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ result: sale })));
    const onRequestConfirmation = vi.fn();
    const before = (await db.getSales('kesarwadi')).length;
    render(<AIAssistantView currentBusinessId="kesarwadi" onOpenVoiceOrb={() => {}} onRequestConfirmation={onRequestConfirmation} />);
    fireEvent.change(screen.getByPlaceholderText(/Type Hinglish command/), { target: { value: 'record sale' } });
    fireEvent.submit(screen.getByPlaceholderText(/Type Hinglish command/).closest('form')!);
    await waitFor(() => expect(onRequestConfirmation).toHaveBeenCalledOnce());
    expect((await db.getSales('kesarwadi')).length).toBe(before);
    expect(onRequestConfirmation.mock.calls[0][0].requires_owner_confirmation).toBe(true);
  });

  it('prevents repeated confirmation clicks while execution is in flight', async () => {
    let finish!: (value: string) => void;
    const execute = vi.spyOn(aiAgent, 'executeAction').mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const confirmed = vi.fn();
    render(<OwnerConfirmModal pendingAction={sale} onConfirm={confirmed} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Execute/ }));
    fireEvent.click(screen.getByRole('button', { name: /Processing/ }));
    expect(execute).toHaveBeenCalledTimes(1);
    finish('Saved');
    await waitFor(() => expect(confirmed).toHaveBeenCalledWith('Saved'));
  });

  it('does not expose business records through personal workspace filters', async () => {
    const allSales = await db.getSales();
    expect(allSales.some(s => s.businessId === 'kesarwadi')).toBe(true);
    expect((await db.getSales('personal')).every(s => s.businessId === 'personal')).toBe(true);
    expect((await db.getInventory('personal')).every(i => i.businessId === 'personal')).toBe(true);
    expect((await db.getSuppliers('personal')).every(s => s.businessId === 'personal')).toBe(true);
    expect((await db.getPayables('personal')).every(p => p.businessId === 'personal')).toBe(true);
  });
});
