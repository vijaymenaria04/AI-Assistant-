import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useTranslation } from '../services/i18n';

interface SplashScreenProps {
  onFinish: () => void;
  theme: 'dark' | 'light';
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, theme }) => {
  const { lang } = useTranslation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let current = 0;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      current = Math.min(100, current + 5);
      setProgress(current);
      if (current === 100) {
        clearInterval(timer);
        finishTimer = setTimeout(onFinish, 300);
      }
    }, 50);
    return () => { clearInterval(timer); if (finishTimer) clearTimeout(finishTimer); };
  }, [onFinish]);

  return (
    <div className="brand-splash" data-theme={theme} aria-label={lang === 'hi' ? 'गोपाल AI शुरू हो रहा है' : 'Starting GopalAI'}>
      <div className="splash-grid" aria-hidden="true" />
      <div className="splash-top"><span className="splash-top-mark"><Sparkles size={14} /> GOPALAI</span><span className="splash-top-edition">{lang === 'hi' ? 'आपका निजी असिस्टेंट' : 'YOUR PERSONAL ASSISTANT'}</span></div>
      <div className="splash-center">
        <div className="splash-emblem-wrap">
          <div className="splash-emblem-orbit splash-emblem-orbit-outer" />
          <div className="splash-emblem-orbit splash-emblem-orbit-inner" />
          <div className="splash-emblem-glow" />
          <div className="splash-emblem"><img src="/gopalai-logo.png" alt="GopalAI logo" width="512" height="512" /></div>
          <div className="splash-spark"><Sparkles size={16} /></div>
        </div>
        <div className="splash-brand-copy">
          <h1>Gopal<span>AI</span></h1>
          <div className="splash-assistant">ASSISTANT</div>
          <div className="splash-kicker"><span /> {lang === 'hi' ? 'आपका स्मार्ट बिज़नेस साथी' : 'YOUR SMART BUSINESS COMPANION'} <span /></div>
          <p>{lang === 'hi' ? 'आपका कारोबार। आपकी दुनिया। एक साथ।' : 'Your business. Your world. All together.'}</p>
        </div>
        <div className="splash-brand-pill"><span className="splash-status-dot" /> {lang === 'hi' ? 'आपके लिए बनाया गया' : 'MADE FOR YOUR EVERYDAY'} <ArrowUpRight size={13} /></div>
      </div>
      <div className="splash-footer">
        <div className="splash-progress-header"><span>{lang === 'hi' ? 'कार्यक्षेत्र तैयार हो रहा है' : 'Preparing your workspace'}</span><span>{progress}%</span></div>
        <div className="splash-progress" role="progressbar" aria-label={lang === 'hi' ? 'शुरू हो रहा है' : 'Starting up'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{ width: `${progress}%` }} /></div>
        <div className="splash-footer-note">{lang === 'hi' ? 'सोच-समझकर बनाया गया · आपके लिए' : 'THOUGHTFULLY MADE · FOR YOU'}</div>
      </div>
    </div>
  );
};
