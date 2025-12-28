import React from 'react';
import { Timer, Trophy, Skull } from 'lucide-react';
import { WIN_SCORE } from '../constants';

interface UIOverlayProps {
  p1Score: number;
  p2Score: number;
  timeLeft: number;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ p1Score, p2Score, timeLeft }) => {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute top-0 left-0 w-full p-4 pointer-events-none flex justify-between items-start z-10">
      
      {/* Player 1 HUD */}
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-4 bg-gray-900/80 p-3 rounded-br-2xl border-l-4 border-blue-500 backdrop-blur">
          <div className="flex flex-col">
            <span className="text-blue-400 font-bold text-sm tracking-wider">PLAYER 1</span>
            <div className="flex items-center gap-2">
                <Trophy size={20} className="text-yellow-400" />
                <span className="text-3xl font-arcade text-white">{p1Score}</span>
                <span className="text-gray-500 text-xs">/ {WIN_SCORE}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Timer */}
      <div className={`flex flex-col items-center bg-gray-900/80 px-6 py-2 rounded-b-xl border-b-2 border-gray-600 backdrop-blur ${timeLeft <= 10 ? 'animate-pulse' : ''}`}>
        <div className="flex items-center gap-2">
          <Timer size={24} className={timeLeft <= 30 ? "text-red-500" : "text-gray-300"} />
          <span className={`text-4xl font-arcade ${timeLeft <= 30 ? "text-red-500" : "text-white"}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Player 2 HUD */}
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-4 bg-gray-900/80 p-3 rounded-bl-2xl border-r-4 border-red-500 backdrop-blur">
          <div className="flex flex-col items-end">
            <span className="text-red-400 font-bold text-sm tracking-wider">PLAYER 2</span>
            <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">{WIN_SCORE} \</span>
                <span className="text-3xl font-arcade text-white">{p2Score}</span>
                <Trophy size={20} className="text-yellow-400" />
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default UIOverlay;