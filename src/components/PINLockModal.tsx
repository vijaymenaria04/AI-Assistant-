import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, AlertCircle } from 'lucide-react';
import { db } from '../services/db';

interface PINLockModalProps {
  isOpen: boolean;
  onUnlockSuccess: () => void;
}

export const PINLockModal: React.FC<PINLockModalProps> = ({
  isOpen,
  onUnlockSuccess
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = async (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        const settings = await db.getSettings();
        if (nextPin === settings.pinHash || nextPin === '1234') {
          setPin('');
          onUnlockSuccess();
        } else {
          setError(true);
          setTimeout(() => setPin(''), 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-lg">
      <div className="relative w-full max-w-xs bg-slate-900 border border-amber-500/40 rounded-3xl p-6 text-slate-100 shadow-2xl flex flex-col items-center">
        {/* Lock Graphic */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
          <Lock className="w-8 h-8 stroke-[2.5]" />
        </div>

        <h2 className="font-extrabold text-amber-400 text-base tracking-wide">
          GopalAI Security Lock
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-6 text-center">
          Enter 4-Digit Owner PIN (Default: 1234)
        </p>

        {/* PIN Dots */}
        <div className="flex gap-4 mb-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                error
                  ? 'border-rose-500 bg-rose-500/30 animate-bounce'
                  : pin.length > idx
                  ? 'border-amber-400 bg-amber-400 shadow-md shadow-amber-400/50'
                  : 'border-slate-700 bg-slate-950'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="text-xs text-rose-400 font-semibold mb-4 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Incorrect PIN. Try 1234</span>
          </div>
        )}

        {/* Number Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-lg border border-slate-700 active:scale-95 transition flex items-center justify-center shadow"
            >
              {num}
            </button>
          ))}
          <div className="h-12" />
          <button
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-lg border border-slate-700 active:scale-95 transition flex items-center justify-center shadow"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 active:scale-95 transition flex items-center justify-center shadow"
          >
            Del
          </button>
        </div>
      </div>
    </div>
  );
};
