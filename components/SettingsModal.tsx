import React from 'react';
import { GameSettings } from '../types';
import { X, Save } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onSave: (newSettings: GameSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [tempSettings, setTempSettings] = React.useState<GameSettings>(settings);

  React.useEffect(() => {
    setTempSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(tempSettings);
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-800 border-2 border-slate-600 rounded-lg p-6 w-96 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white font-arcade">SETTINGS</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-blue-400 mb-2">
              MATCH DURATION (Seconds)
            </label>
            <input
              type="number"
              value={tempSettings.matchDuration}
              onChange={(e) => setTempSettings({ ...tempSettings, matchDuration: parseInt(e.target.value) || 60 })}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
              min="30"
              max="600"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-red-400 mb-2">
              SCORE TO WIN
            </label>
            <input
              type="number"
              value={tempSettings.winScore}
              onChange={(e) => setTempSettings({ ...tempSettings, winScore: parseInt(e.target.value) || 1 })}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-red-500 outline-none"
              min="1"
              max="20"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow transition-colors"
          >
            <Save size={18} /> SAVE
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;