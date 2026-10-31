export interface AndroidActionPayload {
  type: 'CALL' | 'OPEN_APP' | 'SEARCH' | 'MAPS' | 'REMINDER' | 'SHARE';
  target: string;
  detail?: string;
}

class AndroidAutomationService {
  // Initiate Phone Call intent
  public initiatePhoneCall(numberOrContact: string): void {
    const cleanNum = numberOrContact.replace(/[^\d+]/g, '');
    if (cleanNum) {
      window.open(`tel:${cleanNum}`, '_self');
    } else {
      // Open contact query in default phone app
      window.open(`tel:${encodeURIComponent(numberOrContact)}`, '_self');
    }
  }

  // Open external Android app intent
  public openApp(appName: string): boolean {
    const appLower = appName.toLowerCase();
    let url = '';

    if (appLower.includes('youtube')) {
      url = 'https://www.youtube.com';
    } else if (appLower.includes('whatsapp')) {
      url = 'https://web.whatsapp.com';
    } else if (appLower.includes('map')) {
      url = 'https://maps.google.com';
    } else if (appLower.includes('calendar')) {
      url = 'https://calendar.google.com';
    } else if (appLower.includes('contact')) {
      url = 'https://contacts.google.com';
    } else if (appLower.includes('calculator')) {
      url = 'https://www.google.com/search?q=calculator';
    } else {
      url = `https://www.google.com/search?q=${encodeURIComponent(appName)}`;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    }
    return false;
  }

  // Search internet intent
  public searchWeb(query: string): void {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  }

  // Open Maps intent
  public openMaps(location: string): void {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  }

  // Play audio sound effects
  public playSoundEffect(type: 'success' | 'beep' | 'chime' | 'mic_start') {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'mic_start') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'beep') {
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      }
    } catch (e) {
      // Ignore audio synth errors on strict autoplay browsers
    }
  }

  // Push system browser / Android notification
  public async showSystemNotification(title: string, message: string, icon?: string): Promise<boolean> {
    try {
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') {
        new Notification(title, { body: message, icon: icon || '/favicon.ico' });
        return true;
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body: message, icon: icon || '/favicon.ico' });
          return true;
        }
      }
    } catch (e) {
      console.warn('System notification error:', e);
    }
    return false;
  }
}

export const androidAutomation = new AndroidAutomationService();
