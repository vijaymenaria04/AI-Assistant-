import React, { useEffect, useState } from 'react';
import { Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onFinish, 300);
          return 100;
        }
        return prev + 5;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-slate-100 animate-in fade-in duration-300">
      <div className="w-full text-right">
        <span className="text-[11px] font-mono tracking-widest text-amber-400/80 uppercase">
          Android Edition v2.5
        </span>
      </div>

      {/* Main Logo & Title */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-sm">
        {/* Circular Glowing Logo */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-36 h-36 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-1 shadow-2xl shadow-amber-500/40 border-2 border-amber-300">
            <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center">
              <span className="font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 tracking-wider">
                GAI
              </span>
              <span className="text-[9px] font-bold text-amber-400/90 tracking-widest uppercase mt-0.5">
                AGENT
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-amber-200 to-amber-400 tracking-wide">
            GopalAI Assistant
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Complete Personal AI Agent & Business System
          </p>
        </div>

        {/* Business Badges */}
        <div className="flex flex-wrap justify-center gap-1.5 pt-2">
          <span className="px-2.5 py-1 rounded-full bg-slate-900/80 border border-amber-500/30 text-[10px] font-semibold text-amber-300 backdrop-blur-sm">
            Jain Sweets
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-900/80 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300 backdrop-blur-sm">
            Paan Bai Canteen
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-900/80 border border-orange-500/30 text-[10px] font-semibold text-orange-300 backdrop-blur-sm">
            Kesarwadi Canteen
          </span>
        </div>
      </div>

      {/* Progress Bar & Footer */}
      <div className="w-full max-w-xs space-y-3 text-center">
        <div className="relative w-full h-2 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-100 shadow-md shadow-amber-500/50"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Local Database Ready</span>
          </span>
          <span className="font-mono text-amber-400 font-bold">{progress}%</span>
        </div>
      </div>
    </div>
  );
};
