declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface VoiceState {
  isListening: boolean;
  isBackgroundListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  volumeLevel: number;
}

type VoiceStateCallback = (state: VoiceState) => void;

class VoiceService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private state: VoiceState = {
    isListening: false,
    isBackgroundListening: false,
    isSpeaking: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    volumeLevel: 0
  };
  private listeners: Set<VoiceStateCallback> = new Set();
  private animFrameId: number | null = null;

  constructor() {
    this.initSpeech();
  }

  private initSpeech() {
    if (typeof window !== 'undefined') {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        this.recognition = new SpeechRec();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'hi-IN'; // Default Hindi / Hinglish

        this.recognition.onstart = () => {
          this.updateState({ isListening: true, transcript: '', interimTranscript: '', error: null });
          this.simulateVolumeOrb();
        };

        this.recognition.onresult = (event: any) => {
          let final = '';
          let interim = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (final) {
            this.updateState({ transcript: final, interimTranscript: '' });
          } else {
            this.updateState({ interimTranscript: interim });
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn('Speech recognition event error:', event.error);
          this.stopListening();
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            this.updateState({
              isListening: false,
              error: `Voice error (${event.error}). Tap mic to retry.`
            });
          } else {
            this.updateState({ isListening: false, error: null });
          }
        };

        this.recognition.onend = () => {
          if (this.state.isBackgroundListening && !this.state.isSpeaking) {
            // Auto restart for continuous background mode
            setTimeout(() => {
              try {
                this.recognition.start();
              } catch (e) {}
            }, 500);
          } else {
            this.stopListening();
          }
        };
      }

      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
        // Warm up voices
        if (this.synthesis.onvoiceschanged !== undefined) {
          this.synthesis.onvoiceschanged = () => {
            if (this.synthesis) this.synthesis.getVoices();
          };
        }
      }
    }
  }

  public subscribe(cb: VoiceStateCallback): () => void {
    this.listeners.add(cb);
    cb(this.state);
    return () => this.listeners.delete(cb);
  }

  private updateState(partial: Partial<VoiceState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((cb) => cb(this.state));
  }

  public startListening(lang: 'hi-IN' | 'en-IN' = 'hi-IN') {
    if (!this.recognition) {
      this.initSpeech();
    }

    if (!this.recognition) {
      this.updateState({ error: 'Speech recognition is not supported in this browser. Please use text input below.' });
      return;
    }

    if (this.state.isSpeaking) {
      this.stopSpeaking();
    }

    try {
      this.recognition.lang = lang;
      this.recognition.start();
    } catch (err: any) {
      console.warn('Recognition start exception, retrying:', err);
      try {
        this.recognition.stop();
        setTimeout(() => this.recognition.start(), 200);
      } catch (e) {}
    }
  }

  public stopListening() {
    if (this.recognition && this.state.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.updateState({ isListening: false, volumeLevel: 0 });
  }

  public toggleBackgroundListening(enabled: boolean) {
    this.updateState({ isBackgroundListening: enabled });
    if (enabled) {
      this.startListening();
    } else {
      this.stopListening();
    }
  }

  private simulateVolumeOrb() {
    const loop = () => {
      if (this.state.isListening) {
        const volume = Math.random() * 0.8 + 0.2;
        this.updateState({ volumeLevel: volume });
        this.animFrameId = requestAnimationFrame(loop);
      }
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public speak(text: string, onComplete?: () => void) {
    if (!this.synthesis) {
      if (onComplete) onComplete();
      return;
    }

    this.stopSpeaking();

    // Clean text for speech
    const cleanText = text.replace(/₹/g, ' rupees ').replace(/\*/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voices = this.synthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.toLowerCase().includes('hi') || v.lang.toLowerCase().includes('in')) ||
      voices.find((v) => v.lang.toLowerCase().includes('en')) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.updateState({ isSpeaking: true });
    };

    utterance.onend = () => {
      this.updateState({ isSpeaking: false });
      if (onComplete) onComplete();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis playback error:', e);
      this.updateState({ isSpeaking: false });
      if (onComplete) onComplete();
    };

    try {
      this.synthesis.speak(utterance);
    } catch (err) {
      this.updateState({ isSpeaking: false });
      if (onComplete) onComplete();
    }
  }

  public stopSpeaking() {
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch (e) {}
    }
    this.updateState({ isSpeaking: false });
  }

  public getState(): VoiceState {
    return this.state;
  }
}

export const voice = new VoiceService();
