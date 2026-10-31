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
  errorCode: string | null;
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
    errorCode: null,
    volumeLevel: 0
  };
  private listeners: Set<VoiceStateCallback> = new Set();
  private animFrameId: number | null = null;
  private preferredSpeed = 1;
  private preferredGender: 'female' | 'male' = 'female';
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

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
          this.updateState({ isListening: true, transcript: '', interimTranscript: '', error: null, errorCode: null });
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
          const code = typeof event.error === 'string' ? event.error : 'unknown';
          this.clearRestart();
          this.stopAnimation();
          // Do not repeatedly request access after permission or service failure.
          this.updateState({ isListening: false, isBackgroundListening: false, volumeLevel: 0, errorCode: code, error: this.errorMessage(code) });
        };

        this.recognition.onend = () => {
          this.stopAnimation();
          this.updateState({ isListening: false, volumeLevel: 0 });
          if (this.state.isBackgroundListening && !this.state.isSpeaking && !this.state.errorCode) {
            this.clearRestart();
            this.restartTimer = setTimeout(() => {
              this.restartTimer = null;
              if (!this.state.isBackgroundListening || this.state.isSpeaking || this.state.errorCode) return;
              try { this.recognition.start(); }
              catch { this.updateState({ isBackgroundListening: false, errorCode: 'start-failed', error: this.errorMessage('start-failed') }); }
            }, 500);
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

  private errorMessage(code: string): string {
    switch (code) {
      case 'not-allowed': return 'Microphone access was denied. Allow microphone access in Chrome and Android settings, then try again. Embedded previews may block microphone access.';
      case 'microphone-policy': return 'This embedded preview does not allow microphone access. The host must enable microphone permission for the preview. You can type your command below.';
      case 'insecure-context': return 'Microphone access requires a secure HTTPS page. Use the text input below.';
      case 'service-not-allowed': return 'The browser speech service is not available or permitted. Check Chrome and device settings, or type your command.';
      case 'audio-capture': return 'Microphone not available. Check that it is connected and not being used by another app.';
      case 'network': return 'The speech service needs a working internet connection. You can type your command below.';
      case 'no-speech': return 'No speech was detected. Tap the microphone and try again.';
      case 'aborted': return 'Listening stopped. Tap the microphone to try again.';
      case 'unsupported': return 'Speech recognition is not supported in this browser. Please use the text input below.';
      default: return 'Voice could not start. Check microphone permissions or type your command below.';
    }
  }

  private clearRestart() {
    if (this.restartTimer !== null) clearTimeout(this.restartTimer);
    this.restartTimer = null;
  }

  private stopAnimation() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = null;
  }

  public startListening(lang: 'hi-IN' | 'en-IN' = 'hi-IN') {
    this.clearRestart();
    // Check the host's iframe policy without requesting access outside the user's click.
    const doc = document as Document & { permissionsPolicy?: { allowsFeature: (name: string) => boolean }; featurePolicy?: { allowsFeature: (name: string) => boolean } };
    const policy = doc.permissionsPolicy || doc.featurePolicy;
    if (window.isSecureContext === false) {
      this.updateState({ isBackgroundListening: false, errorCode: 'insecure-context', error: this.errorMessage('insecure-context') });
      return;
    }
    if (policy && !policy.allowsFeature('microphone')) {
      this.updateState({ isBackgroundListening: false, errorCode: 'microphone-policy', error: this.errorMessage('microphone-policy') });
      return;
    }
    if (!this.recognition) this.initSpeech();
    if (!this.recognition) {
      this.updateState({ isBackgroundListening: false, errorCode: 'unsupported', error: this.errorMessage('unsupported') });
      return;
    }
    if (this.state.isSpeaking) this.stopSpeaking();
    this.updateState({ error: null, errorCode: null, transcript: '', interimTranscript: '' });
    try {
      this.recognition.lang = lang;
      this.recognition.start();
    } catch (err) {
      console.warn('Speech recognition could not start:', err);
      this.updateState({ isListening: false, isBackgroundListening: false, errorCode: 'start-failed', error: this.errorMessage('start-failed') });
    }
  }

  public stopListening() {
    this.clearRestart();
    if (this.recognition && this.state.isListening) {
      try { this.recognition.stop(); } catch { /* Already stopped. */ }
    }
    this.stopAnimation();
    this.updateState({ isListening: false, volumeLevel: 0 });
  }

  public takeTranscript(): string {
    const transcript = this.state.transcript;
    if (transcript) this.updateState({ transcript: '', interimTranscript: '' });
    return transcript;
  }

  public toggleBackgroundListening(enabled: boolean, lang: 'hi-IN' | 'en-IN' = 'hi-IN') {
    this.updateState({ isBackgroundListening: enabled });
    if (enabled) this.startListening(lang);
    else this.stopListening();
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

  public setPreferences(speed?: number, gender?: 'female' | 'male') {
    if (typeof speed === 'number' && Number.isFinite(speed)) this.preferredSpeed = Math.max(0.5, Math.min(2, speed));
    if (gender === 'female' || gender === 'male') this.preferredGender = gender;
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
    const language = /[\u0900-\u097f]/.test(cleanText) ? 'hi-IN' : 'en-IN';
    utterance.lang = language;
    const languageVoices = voices.filter(v => v.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase()));
    // Browsers do not expose reliable gender metadata; use the preference only when a voice name explicitly indicates it.
    const genderPattern = this.preferredGender === 'female' ? /female|woman|woman voice/i : /\bmale\b|\bman\b/i;
    const preferredVoice = languageVoices.find(v => genderPattern.test(v.name)) || languageVoices.find(v => v.lang.toLowerCase() === language.toLowerCase()) || languageVoices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = this.preferredSpeed;
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
