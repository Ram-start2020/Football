import React, { useState, useEffect } from 'react';

export interface ClearDataOptions {
  records: boolean; // wins/losses
  stats: boolean;   // goals/assists
  all: boolean;     // all players
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: ClearDataOptions) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [keyCode, setKeyCode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ClearDataOptions>({
    records: false,
    stats: false,
    all: false,
  });

  const CORRECT_KEY = 'ball';

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setTimeout(() => {
        setKeyCode('');
        setIsUnlocked(false);
        setError(null);
        setOptions({ records: false, stats: false, all: false });
      }, 300); // Delay reset to allow for closing animation
    }
  }, [isOpen]);

  const handleUnlock = () => {
    if (keyCode.toLowerCase() === CORRECT_KEY) {
      setIsUnlocked(true);
      setError(null);
    } else {
      setError('Incorrect key code. Please try again.');
    }
  };
  
  const handleOptionChange = (option: keyof ClearDataOptions) => {
    setOptions(prev => {
      const newState = { ...prev, [option]: !prev[option] };
      // If 'all' is selected, deselect others
      if (option === 'all' && newState.all) {
        return { records: false, stats: false, all: true };
      }
      // If others are selected, deselect 'all'
      if (option !== 'all' && newState[option]) {
        return { ...newState, all: false };
      }
      return newState;
    });
  };

  const handleConfirmClick = () => {
    const confirmationMessage = options.all
      ? 'Are you absolutely sure? This will delete all players and their stats permanently. This action cannot be undone.'
      : 'Are you sure you want to clear the selected data for all players? This action cannot be undone.';
    
    if (window.confirm(confirmationMessage)) {
      onConfirm(options);
    }
  };
  
  const isConfirmDisabled = !options.records && !options.stats && !options.all;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-100">
        <h2 className="text-2xl font-semibold mb-6 text-amber-400 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995s.145.755.438.995l1.003.827c.48.398.668 1.05.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37-.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.333.183-.582.495-.645.87l-.213 1.28c-.09.543-.56.941-1.11.941h-1.094c-.55 0-1.02-.398-1.11-.94l-.213-1.282c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-.995s-.145-.755-.437-.995l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.87l.213-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
        </h2>
        
        {!isUnlocked ? (
          <form onSubmit={(e) => { e.preventDefault(); handleUnlock(); }} className="space-y-4">
            <p className="text-slate-300">Enter the key code to unlock settings.</p>
            <div>
              <label htmlFor="keyCode" className="block text-sm font-medium text-slate-300 mb-1">Key Code</label>
              <input
                type="password"
                id="keyCode"
                value={keyCode}
                onChange={(e) => setKeyCode(e.target.value)}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-100"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-100 rounded-md">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-semibold">Unlock</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-300 font-semibold text-green-400">Unlocked. Select data to clear:</p>
            
            <div className="space-y-3 pt-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="clear-records"
                    checked={options.records}
                    onChange={() => handleOptionChange('records')}
                    className="h-5 w-5 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-400 accent-sky-500"
                  />
                  <label htmlFor="clear-records" className="ml-3 text-slate-200">Clear Wins/Losses Data</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="clear-stats"
                    checked={options.stats}
                    onChange={() => handleOptionChange('stats')}
                    className="h-5 w-5 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-400 accent-sky-500"
                  />
                  <label htmlFor="clear-stats" className="ml-3 text-slate-200">Clear Goals/Assists Data</label>
                </div>
                <div className="flex items-center pt-3 border-t border-slate-700 mt-4">
                  <input
                    type="checkbox"
                    id="clear-all"
                    checked={options.all}
                    onChange={() => handleOptionChange('all')}
                    className="h-5 w-5 text-red-500 bg-slate-600 border-slate-500 rounded focus:ring-red-400 accent-red-500"
                  />
                  <label htmlFor="clear-all" className="ml-3 text-red-300 font-medium">Clear ALL Data (Deletes all players)</label>
                </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/50 mt-4">
              <button onClick={onClose} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-100 rounded-md">Cancel</button>
              <button
                onClick={handleConfirmClick}
                disabled={isConfirmDisabled}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm & Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
