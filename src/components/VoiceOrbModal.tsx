import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  X,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Radio
} from 'lucide-react';
import { voice, VoiceState } from '../services/voice';
import { aiAgent, ParsedAgentResult } from '../services/aiAgent';
import { BusinessId } from '../types/database';
import { androidAutomation } from '../services/androidAutomation';
import { useTranslation } from '../services/i18n';

interface VoiceOrbModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBusinessId: BusinessId;
  onRequestConfirmation: (result: ParsedAgentResult) => void;
  onActionExecuted: () => void;
}

export const VoiceOrbModal: React.FC<VoiceOrbModalProps> = ({
  isOpen,
  onClose,
  currentBusinessId,
  onRequestConfirmation,
  onActionExecuted
}) => {
  const { t, lang } = useTranslation();
  const [voiceState, setVoiceState] = useState<VoiceState>(voice.getState());
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = voice.subscribe((state) => {
      setVoiceState(state);
      if (state.transcript && !state.isListening && !isProcessing) {
        handleProcessPrompt(state.transcript);
      }
    });
    return unsubscribe;
  }, [isProcessing, currentBusinessId]);

  if (!isOpen) return null;

  const handleToggleMic = () => {
    if (voiceState.isListening) {
      voice.stopListening();
    } else {
      androidAutomation.playSoundEffect('mic_start');
      voice.startListening(lang === 'hi' ? 'hi-IN' : 'en-IN');
    }
  };

  const handleToggleBackgroundListener = () => {
    const next = !voiceState.isBackgroundListening;
    voice.toggleBackgroundListening(next);
  };

  const handleProcessPrompt = async (prompt: string) => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    setLastResponse(null);

    try {
      const { result } = await aiAgent.processCommand(prompt, currentBusinessId);

      if (result.requires_owner_confirmation) {
        setLastResponse(result.speech_response || 'Owner confirmation required for this action.');
        onRequestConfirmation(result);
        if (voiceState.isSpeaking) voice.stopSpeaking();
        voice.speak(result.speech_response);
      } else {
        const msg = await aiAgent.executeAction(result);
        setLastResponse(msg);
        onActionExecuted();
      }
    } catch (err: any) {
      setLastResponse('Command process nahi hua. Try again.');
    } finally {
      setIsProcessing(false);
      setTextInput('');
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessPrompt(textInput);
  };

  const quickPrompts = lang === 'hi' ? [
    'आज 500 रुपये खर्च हुए',
    'जैन स्वीट्स में 12000 बिक्री जोड़ें',
    'रमेश सप्लायर को 5000 भुगतान किया',
    'पान बाई कैंटीन 50kg शुगर स्टॉक जोड़ें',
    'रमेश को कॉल लगाओ',
    'यूट्यूब खोलो'
  ] : [
    'Aaj 500 rupaye kharch hue',
    'Jain Sweets me 12000 sale add karo',
    'Ramesh supplier ko 5000 pay kiya',
    'Paan Bai Canteen 50kg Sugar inventory add',
    'Call Ramesh',
    'YouTube open karo'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
      <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-amber-500/40 rounded-3xl p-6 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden flex flex-col items-center backdrop-blur-2xl">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between border-b border-slate-200 dark:border-amber-500/20 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-spin" />
            <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm tracking-wide">
              {t('voiceAgentTitle')}
            </span>
          </div>
          <button
            onClick={() => {
              voice.stopListening();
              voice.stopSpeaking();
              onClose();
            }}
            className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Background Listener Toggle */}
        <div className="w-full mb-3 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Radio className={`w-4 h-4 ${voiceState.isBackgroundListening ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span>{t('continuousListening')}</span>
          </div>
          <button
            onClick={handleToggleBackgroundListener}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              voiceState.isBackgroundListening
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
            }`}
          >
            {voiceState.isBackgroundListening ? t('active') : t('off')}
          </button>
        </div>

        {/* Central Animated Orb */}
        <div className="relative my-4 flex items-center justify-center">
          <div
            className={`absolute w-44 h-44 rounded-full bg-amber-500/10 border border-amber-400/30 transition-all duration-300 ${
              voiceState.isListening
                ? 'scale-125 animate-ping opacity-75'
                : voiceState.isSpeaking
                ? 'animate-pulse scale-110'
                : 'scale-100'
            }`}
          />
          <div
            className={`absolute w-36 h-36 rounded-full bg-gradient-to-tr from-amber-500/20 to-yellow-400/20 border border-amber-400/40 transition-transform ${
              voiceState.isListening ? 'scale-110' : 'scale-100'
            }`}
          />

          <button
            onClick={handleToggleMic}
            className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 border-4 active:scale-95 ${
              voiceState.isListening
                ? 'bg-gradient-to-tr from-red-500 via-amber-500 to-yellow-400 border-amber-300 shadow-amber-500/50'
                : voiceState.isSpeaking
                ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-400 border-amber-300 shadow-emerald-500/50'
                : 'bg-gradient-to-tr from-slate-900 via-slate-800 to-amber-950 border-amber-500/60 shadow-amber-500/20 hover:border-amber-400'
            }`}
          >
            {voiceState.isListening ? (
              <>
                <Mic className="w-10 h-10 text-slate-950 animate-bounce" />
                <span className="text-[10px] font-bold text-slate-950 mt-1 uppercase">{t('listening')}</span>
              </>
            ) : voiceState.isSpeaking ? (
              <>
                <Volume2 className="w-10 h-10 text-slate-950 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-950 mt-1 uppercase">{t('speaking')}</span>
              </>
            ) : (
              <>
                <Mic className="w-10 h-10 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 mt-1 uppercase">{t('tapToSpeak')}</span>
              </>
            )}
          </button>
        </div>

        {/* Output */}
        <div className="w-full text-center min-h-[48px] mb-4">
          {voiceState.isListening && (
            <div className="text-amber-600 dark:text-amber-300 text-xs font-semibold animate-pulse">
              {voiceState.interimTranscript || voiceState.transcript || 'Listening...'}
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </div>
          )}

          {lastResponse && !isProcessing && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-amber-500/30 rounded-2xl text-left text-xs text-slate-800 dark:text-slate-200 shadow-inner flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-600 dark:text-amber-300 mb-0.5">{t('aiResponseLabel')}</div>
                <div>{lastResponse}</div>
              </div>
            </div>
          )}

          {voiceState.error && (
            <div className="text-xs text-rose-500 font-medium mt-1 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{voiceState.error}</span>
            </div>
          )}
        </div>

        {/* Text Input */}
        <form onSubmit={handleTextSubmit} className="w-full flex items-center gap-2 mb-4">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={t('typeHinglishCommand')}
            className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-amber-500/30 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || isProcessing}
            className="p-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-xl font-bold hover:brightness-110 disabled:opacity-50 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Prompts */}
        <div className="w-full">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-amber-500 dark:text-amber-400" />
            <span>Example Voice Commands</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {quickPrompts.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => handleProcessPrompt(cmd)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-amber-500/20 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700 text-left transition"
              >
                "{cmd}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
