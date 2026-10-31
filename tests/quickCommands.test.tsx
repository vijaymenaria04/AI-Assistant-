// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { db } from '../src/services/db';
import { i18n } from '../src/services/i18n';
import { SalesView } from '../src/views/SalesView';
import { PersonalFinanceView } from '../src/views/PersonalFinanceView';
import { TasksRemindersView } from '../src/views/TasksRemindersView';
import { voice, type VoiceState } from '../src/services/voice';

beforeEach(async () => { i18n.setLanguage('en'); await db.init(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const fakeResult = { action:'ADD_SALE', business_id:'kesarwadi', requires_owner_confirmation:false, speech_response:'Sale already recorded!', parameters:{amount:234,date:'2026-10-31',payment_method:'upi'} };

it('routes Sales quick commands to approval, without reporting a model claim as success', async () => {
  vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({result:fakeResult})));
  const confirm = vi.fn(); const before = (await db.getSales('kesarwadi')).length;
  render(<SalesView currentBusinessId="kesarwadi" onRequestConfirmation={confirm} />);
  const field = screen.getByPlaceholderText(/Record Sale via Voice/); fireEvent.change(field,{target:{value:'sale'}}); fireEvent.submit(field.closest('form')!);
  await waitFor(()=>expect(confirm).toHaveBeenCalledOnce());
  expect((await db.getSales('kesarwadi')).length).toBe(before);
  expect(screen.queryByText('Sale already recorded!')).toBeNull();
  expect(screen.getByText(/No changes have been made yet/)).toBeTruthy();
});

it('does not fake success when a Personal quick command cannot open confirmation', async () => {
  vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({result:{action:'ADD_PERSONAL_TRANSACTION',business_id:'personal',parameters:{amount:50,date:'2026-10-31',payment_method:'cash',transaction_type:'expense',category:'Travel'},speech_response:'Done!',requires_owner_confirmation:false}})));
  render(<PersonalFinanceView />); const field=screen.getByPlaceholderText(/Voice\/Text Command in Hindi/); fireEvent.change(field,{target:{value:'personal expense'}}); fireEvent.submit(field.closest('form')!);
  expect(await screen.findByText(/No action was taken/)).toBeTruthy(); expect(screen.queryByText('Done!')).toBeNull();
});

it('shows microphone failure in the task assistant instead of getting stuck listening', async () => {
  let callback!: (state:VoiceState)=>void;
  const state: VoiceState = { isListening:false,isBackgroundListening:false,isSpeaking:false,transcript:'',interimTranscript:'',error:null,errorCode:null,volumeLevel:0 };
  vi.spyOn(voice,'subscribe').mockImplementation(cb => { callback=cb; cb(state); return () => {}; });
  vi.spyOn(voice,'startListening').mockImplementation(() => callback({...state,error:'Microphone denied',errorCode:'not-allowed'}));
  render(<TasksRemindersView currentBusinessId="personal" />);
  fireEvent.click(screen.getByRole('button',{name:'Voice command'}));
  expect(await screen.findByText('Microphone denied')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Voice command'})).toBeTruthy();
});
