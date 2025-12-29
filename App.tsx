import React, { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import SettingsModal from './components/SettingsModal';
import { GameSettings, GameStatus } from './types';
import { MATCH_DURATION_DEFAULT, WIN_SCORE_DEFAULT } from './constants';

const App: React.FC = () => {
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MATCH_DURATION_DEFAULT);
  
  // Game Control State
  const [isPaused, setIsPaused] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('START');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    matchDuration: MATCH_DURATION_DEFAULT,
    winScore: WIN_SCORE_DEFAULT
  });

  const handleScoreUpdate = useCallback((s1: number, s2: number) => {
    setP1Score(s1);
    setP2Score(s2);
  }, []);

  const handleTimeUpdate = useCallback((t: number) => {
    setTimeLeft(t);
  }, []);

  const handleGameOver = useCallback((winnerId: number) => {
    console.log(`Game Over. Winner: Player ${winnerId}`);
    setGameStatus('OVER');
  }, []);

  const handleGameStart = useCallback(() => {
    setGameStatus('PLAYING');
  }, []);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const saveSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
  };

  return (
    <div className="w-screen h-screen bg-gray-950 flex justify-center items-center overflow-hidden">
      <div className="relative w-full h-full max-w-[1280px] max-h-[720px] aspect-video shadow-2xl">
        <UIOverlay 
            p1Score={p1Score} 
            p2Score={p2Score} 
            timeLeft={timeLeft} 
            winScore={settings.winScore}
            isPaused={isPaused}
            gameStatus={gameStatus}
            onPauseToggle={togglePause}
            onOpenSettings={() => { setIsPaused(true); setShowSettings(true); }}
        />
        
        <SettingsModal 
            isOpen={showSettings} 
            onClose={() => { setShowSettings(false); setIsPaused(false); }}
            settings={settings}
            onSave={saveSettings}
        />

        <GameCanvas 
            onScoreUpdate={handleScoreUpdate} 
            onTimeUpdate={handleTimeUpdate}
            onGameOver={handleGameOver}
            onGameStart={handleGameStart}
            gameStatus={gameStatus}
            settings={settings}
            isPaused={isPaused}
        />
      </div>
    </div>
  );
};

export default App;