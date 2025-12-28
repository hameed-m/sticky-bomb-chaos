import React, { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';

const App: React.FC = () => {
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);

  const handleScoreUpdate = useCallback((s1: number, s2: number) => {
    setP1Score(s1);
    setP2Score(s2);
  }, []);

  const handleTimeUpdate = useCallback((t: number) => {
    setTimeLeft(t);
  }, []);

  const handleGameOver = useCallback((winnerId: number) => {
    // Optional: Log game over analytics here
    console.log(`Game Over. Winner: Player ${winnerId}`);
  }, []);

  return (
    <div className="w-screen h-screen bg-gray-950 flex justify-center items-center overflow-hidden">
      <div className="relative w-full h-full max-w-[1280px] max-h-[720px] aspect-video shadow-2xl">
        <UIOverlay p1Score={p1Score} p2Score={p2Score} timeLeft={timeLeft} />
        <GameCanvas 
            onScoreUpdate={handleScoreUpdate} 
            onTimeUpdate={handleTimeUpdate}
            onGameOver={handleGameOver}
        />
      </div>
    </div>
  );
};

export default App;