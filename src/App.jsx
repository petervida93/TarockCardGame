import { useState } from 'react';
import Lobby from './components/Lobby';
import GameBoardMultiplayer from './components/GameBoardMultiplayer';
import GameBoard from './components/GameBoard'; // Eredeti single-player verzió

function App() {
  const [gameSession, setGameSession] = useState(null);
  const [mode, setMode] = useState('menu'); // 'menu', 'multiplayer', 'singleplayer'

  const handleGameStart = (session) => {
    console.log('Starting game with session:', session);
    setGameSession(session);
    setMode('multiplayer');
  };

  const handleBackToMenu = () => {
    setMode('menu');
    setGameSession(null);
  };

  // Menu
  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-800 to-green-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-8">
            🎮 Tarokk Játék
          </h1>
          
          <div className="space-y-4">
            <button
              onClick={() => setMode('lobby')}
              className="w-full px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg 
                       rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🌐 Multiplayer (Online)
            </button>
            
            <button
              onClick={() => setMode('singleplayer')}
              className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 text-white font-bold text-lg 
                       rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🤖 Single Player (AI)
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-200 text-center">
              Válassz játékmódot a kezdéshez
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Lobby (multiplayer)
  if (mode === 'lobby') {
    return <Lobby onGameStart={handleGameStart} />;
  }

  // Multiplayer játék
  if (mode === 'multiplayer' && gameSession) {
    return (
      <GameBoardMultiplayer
        gameId={gameSession.gameId}
        playerIndex={gameSession.playerIndex}
        playerName={gameSession.playerName}
        initialGame={gameSession.game}
      />
    );
  }

  // Single player (eredeti AI verzió)
  if (mode === 'singleplayer') {
    return (
      <div>
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={handleBackToMenu}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-all"
          >
            ← Vissza a menübe
          </button>
        </div>
        <GameBoard />
      </div>
    );
  }

  return <Lobby onGameStart={handleGameStart} />;
}

export default App;
