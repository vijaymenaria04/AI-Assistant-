// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

class FakeRecognition {
  static latest: FakeRecognition;
  lang = '';
  continuous = false;
  interimResults = false;
  onstart?: () => void;
  onend?: () => void;
  onerror?: (event: { error: string }) => void;
  onresult?: (event: unknown) => void;
  start = vi.fn(() => { this.onstart?.(); });
  stop = vi.fn(() => { this.onend?.(); });
  constructor() { FakeRecognition.latest = this; }
}

beforeEach(() => {
  vi.resetModules();
  Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: FakeRecognition });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); delete (document as any).featurePolicy; delete (document as any).permissionsPolicy; });

describe('voice permissions', () => {
  it('reports an iframe microphone block without asking repeatedly', async () => {
    Object.defineProperty(document, 'permissionsPolicy', { configurable: true, value: { allowsFeature: () => false } });
    const { voice } = await import('../src/services/voice');
    voice.startListening('hi-IN');
    expect(voice.getState().errorCode).toBe('microphone-policy');
    expect(voice.getState().error).toMatch(/embedded preview/i);
    expect(FakeRecognition.latest.start).not.toHaveBeenCalled();
  });

  it('stops automatic retries after microphone permission is denied', async () => {
    vi.useFakeTimers();
    const { voice } = await import('../src/services/voice');
    voice.toggleBackgroundListening(true, 'en-IN');
    const rec = FakeRecognition.latest;
    expect(rec.lang).toBe('en-IN');
    expect(rec.start).toHaveBeenCalledTimes(1);
    rec.onerror?.({ error: 'not-allowed' });
    rec.onend?.();
    vi.advanceTimersByTime(2000);
    expect(rec.start).toHaveBeenCalledTimes(1);
    expect(voice.getState().isBackgroundListening).toBe(false);
    expect(voice.getState().error).toMatch(/chrome and android/i);
    voice.startListening('hi-IN');
    expect(rec.start).toHaveBeenCalledTimes(2);
    expect(voice.getState().error).toBeNull();
    voice.toggleBackgroundListening(false);
  });

  it('shows actionable Hindi permission guidance and leaves the text input usable', async () => {
    const { i18n } = await import('../src/services/i18n');
    i18n.setLanguage('hi');
    const { VoiceOrbModal } = await import('../src/components/VoiceOrbModal');
    render(<VoiceOrbModal isOpen onClose={() => {}} currentBusinessId="jain-sweets" onRequestConfirmation={() => {}} onActionExecuted={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'बोलने के लिए टैप करें' }));
    act(() => { FakeRecognition.latest.onerror?.({ error: 'not-allowed' }); FakeRecognition.latest.onend?.(); });
    expect(screen.getByRole('alert').textContent).toMatch(/माइक्रोफ़ोन की अनुमति नहीं मिली/);
    expect(screen.getByRole('alert').textContent).toMatch(/Embedded preview/);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'मुझे मदद चाहिए' } });
    expect((input as HTMLInputElement).value).toBe('मुझे मदद चाहिए');
    i18n.setLanguage('en');
  });

  it('removes the background switch and sample commands, while keeping text submission and mic cleanup', async () => {
    const { voice } = await import('../src/services/voice');
    const { aiAgent } = await import('../src/services/aiAgent');
    const process = vi.spyOn(aiAgent, 'processCommand').mockResolvedValue({ result: { action: 'UNKNOWN_QUERY', requires_owner_confirmation: false, speech_response: 'Please clarify.', parameters: {} }, executed: false });
    const close = vi.fn();
    const { VoiceOrbModal } = await import('../src/components/VoiceOrbModal');
    render(<VoiceOrbModal isOpen onClose={close} currentBusinessId="jain-sweets" onRequestConfirmation={() => {}} onActionExecuted={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: 'GopalAI Voice Agent' });
    expect(dialog.textContent).not.toMatch(/Continuous Background Listening|Example Voice Commands|Ramesh/);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'my command' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(process).toHaveBeenCalledWith('my command', 'jain-sweets'));
    expect(await screen.findByText('Please clarify.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tap to speak' }));
    expect(voice.getState().isListening).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(voice.getState().isListening).toBe(false);
    expect(close).toHaveBeenCalledOnce();
  });

  it('consumes a finished voice transcript only once', async () => {
    const { voice } = await import('../src/services/voice');
    const { aiAgent } = await import('../src/services/aiAgent');
    const process = vi.spyOn(aiAgent, 'processCommand').mockResolvedValue({ result: { action: 'UNKNOWN_QUERY', requires_owner_confirmation: false, speech_response: 'Please clarify.', parameters: {} }, executed: false });
    const { VoiceOrbModal } = await import('../src/components/VoiceOrbModal');
    render(<VoiceOrbModal isOpen onClose={() => {}} currentBusinessId="jain-sweets" onRequestConfirmation={() => {}} onActionExecuted={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tap to speak' }));
    const rec = FakeRecognition.latest;
    act(() => {
      rec.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'hello' } }] });
      rec.onend?.();
    });
    await waitFor(() => expect(process).toHaveBeenCalledTimes(1));
    act(() => { voice.stopSpeaking(); voice.stopListening(); });
    expect(process).toHaveBeenCalledTimes(1);
    expect(voice.getState().transcript).toBe('');
  });
});
