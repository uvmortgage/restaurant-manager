
import React from 'react';

interface PinPadProps {
  onComplete: (pin: string) => void;
  error?: string;
}

const PinPad: React.FC<PinPadProps> = ({ onComplete, error }) => {
  const [pin, setPin] = React.useState('');

  const handlePress = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleEnter = () => {
    if (pin.length >= 4) {
      onComplete(pin);
      setPin('');
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xs mx-auto animate-fadeIn">
      <div className="flex gap-4 mb-8">
        {[...Array(Math.max(pin.length, 4))].map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              i < pin.length ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-4 font-medium">{error}</p>}

      <div className="grid grid-cols-3 gap-4 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handlePress(num.toString())}
            className="h-16 w-16 mx-auto rounded-full bg-white shadow-sm border border-slate-200 text-xl font-semibold active:bg-slate-100 active:scale-95 transition-all"
          >
            {num}
          </button>
        ))}
        <button
          onClick={handleBackspace}
          className="h-16 w-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center active:scale-95 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
        <button
          onClick={() => handlePress('0')}
          className="h-16 w-16 mx-auto rounded-full bg-white shadow-sm border border-slate-200 text-xl font-semibold active:bg-slate-100 active:scale-95 transition-all"
        >
          0
        </button>
        <button
          onClick={handleEnter}
          disabled={pin.length < 4}
          className="h-16 w-16 mx-auto rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      </div>
    </div>
  );
};

export default PinPad;
