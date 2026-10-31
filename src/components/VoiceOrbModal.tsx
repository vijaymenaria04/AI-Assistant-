import { translateText } from '../services/i18n';
import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Volume2,
  X,
  Send,
  Sparkles,
  AlertCircle,
  RefreshCw
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
  const processingRef = useRef(false);
  const closingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    closingRef.current = false;
    // A transcript from another screen must not be executed when this dialog opens.
    voice.takeTranscript();
    const unsubscribe = voice.subscribe((state) => {
      setVoiceState(state);
      if (state.transcript && !state.isListening && !processingRef.current && !closingRef.current) {
        const transcript = voice.takeTranscript();
        if (transcript) void handleProcessPrompt(transcript);
      }
    });
    return unsubscribe;
  }, [isOpen, currentBusinessId]);

  if (!isOpen) return null;

  const handleToggleMic = () => {
    if (voiceState.isListening) {
      voice.toggleBackgroundListening(false);
    } else {
      androidAutomation.playSoundEffect('mic_start');
      voice.startListening(lang === 'hi' ? 'hi-IN' : 'en-IN');
    }
  };

  const handleProcessPrompt = async (prompt: string) => {
    if (!prompt.trim() || processingRef.current) return;
    processingRef.current = true;
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
      setLastResponse(err instanceof Error ? err.message : 'Command process nahi hua. Try again.');
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      setTextInput('');
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessPrompt(textInput);
  };

  const handleClose = () => {
    closingRef.current = true;
    voice.takeTranscript();
    voice.toggleBackgroundListening(false);
    voice.stopSpeaking();
    onClose();
  };

  return (
    <div className="voice-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-xl">
      <div role="dialog" aria-modal="true" aria-labelledby="voice-dialog-title" className="voice-card relative w-full max-w-md rounded-3xl text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col">
        <div className="voice-card-header flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="voice-header-icon"><Sparkles className="w-5 h-5" /></span>
            <div className="min-w-0">
              <div className="voice-eyebrow">GOPALAI ASSISTANT</div>
              <h2 id="voice-dialog-title" className="voice-title">{t('voiceAgentTitle')}</h2>
            </div>
          </div>
          <button onClick={handleClose} aria-label={lang === 'hi' ? 'बंद करें' : 'Close'} className="voice-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="voice-content">
          <div className="voice-orb-area">
            <div className={`voice-orbit voice-orbit-outer ${voiceState.isListening ? 'is-listening' : ''}`} />
            <div className={`voice-orbit voice-orbit-inner ${voiceState.isListening ? 'is-listening' : ''}`} />
            <button
              onClick={handleToggleMic}
              disabled={isProcessing}
              aria-label={voiceState.isListening ? (lang === 'hi' ? 'सुनना बंद करें' : 'Stop listening') : (lang === 'hi' ? 'बोलने के लिए टैप करें' : 'Tap to speak')}
              className={`voice-orb ${voiceState.isListening ? 'is-listening' : ''} ${voiceState.isSpeaking ? 'is-speaking' : ''}`}
            >
              {voiceState.isSpeaking && !voiceState.isListening ? <Volume2 className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
              <span>{voiceState.isListening ? t('listening') : voiceState.isSpeaking ? t('speaking') : t('tapToSpeak')}</span>
            </button>
          </div>
          <div className="voice-intro">
            <h3>{voiceState.isListening ? (lang === 'hi' ? 'मैं सुन रहा हूँ' : 'Listening to you') : (lang === 'hi' ? 'मैं आपकी कैसे मदद करूँ?' : 'How can I help you?')}</h3>
            <p>{lang === 'hi' ? 'बोलने के लिए माइक्रोफ़ोन पर टैप करें या नीचे लिखें।' : 'Tap the microphone to speak, or type below.'}</p>
          </div>

          <div className="voice-output" aria-live="polite">
            {voiceState.isListening && <div className="text-amber-600 dark:text-amber-300 text-xs font-semibold">{voiceState.interimTranscript || voiceState.transcript || (lang === 'hi' ? 'सुन रहा हूँ...' : 'Listening...')}</div>}
            {isProcessing && <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold"><RefreshCw className="w-4 h-4 animate-spin" /><span>{translateText("Processing...")}</span></div>}
            {lastResponse && !isProcessing && <div className="voice-response"><Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" /><div><div className="font-bold text-amber-700 dark:text-amber-300 mb-1">{t('aiResponseLabel')}</div><div>{lastResponse}</div><button type="button" className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-300 underline" onClick={() => voice.speak(lastResponse)}>{lang === 'hi' ? 'पढ़कर सुनाएँ' : 'Read aloud'}</button></div></div>}
          {voiceState.error && (
            <div role="alert" className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1 flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{lang === 'hi' ? ({
                'not-allowed': 'माइक्रोफ़ोन की अनुमति नहीं मिली। Chrome में साइट की और Android में Chrome की माइक्रोफ़ोन अनुमति चालू करें। Embedded preview भी अनुमति रोक सकता है। नीचे लिखकर भी कमांड भेज सकते हैं।',
                'microphone-policy': 'इस embedded preview में माइक्रोफ़ोन की अनुमति बंद है। Preview host को अनुमति देनी होगी। अभी नीचे लिखकर कमांड भेजें।',
                'insecure-context': 'माइक्रोफ़ोन के लिए सुरक्षित HTTPS पेज चाहिए। अभी नीचे लिखकर कमांड भेजें।',
                'service-not-allowed': 'ब्राउज़र की speech service उपलब्ध नहीं है। Chrome और फ़ोन की सेटिंग जाँचें या नीचे लिखें।',
                'audio-capture': 'माइक्रोफ़ोन उपलब्ध नहीं है। जाँचें कि कोई दूसरा ऐप उसका उपयोग तो नहीं कर रहा।',
                'network': 'बोलकर पहचानने के लिए इंटरनेट जाँचें या नीचे लिखें।',
                'no-speech': 'आवाज़ नहीं मिली। माइक्रोफ़ोन पर टैप करके फिर बोलें।',
                'aborted': 'सुनना बंद हो गया। फिर कोशिश करने के लिए माइक्रोफ़ोन पर टैप करें।',
                'unsupported': 'इस ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है। नीचे लिखकर कमांड भेजें।',
              } as Record<string, string>)[voiceState.errorCode || ''] || 'आवाज़ शुरू नहीं हो सकी। माइक्रोफ़ोन की अनुमति जाँचें या नीचे लिखें।' : voiceState.error}</span>
            </div>
          )}
          </div>

          <form onSubmit={handleTextSubmit} className="voice-compose">
            <label htmlFor="voice-command" className="voice-compose-label">{lang === 'hi' ? 'अपना संदेश लिखें' : 'TYPE YOUR MESSAGE'}</label>
            <div className="voice-compose-row">
              <input id="voice-command" type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder={t('typeHinglishCommand')} className="voice-input" />
              <button type="submit" disabled={!textInput.trim() || isProcessing} aria-label={lang === 'hi' ? 'संदेश भेजें' : 'Send message'} className="voice-send"><Send className="w-5 h-5" /></button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
