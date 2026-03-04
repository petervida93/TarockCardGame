import { useState, useEffect } from 'react';
import socketService from '../services/socketService';

const Lobby = ({ onGameStart }) => {
  const [playerName, setPlayerName] = useState('');
  const [gameIdToJoin, setGameIdToJoin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableGames, setAvailableGames] = useState([]);

  useEffect(() => {
    // Csatlakozás a szerverhez
    socketService.connect();

    // Elérhető játékok lekérése
    fetchAvailableGames();

    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  const fetchAvailableGames = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/games');
      const games = await response.json();
      // A backend már csak a csatlakozható játékokat küldi (waiting vagy disconnected játékossal)
      setAvailableGames(games);
    } catch (err) {
      console.error('Failed to fetch games:', err);
    }
  };

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      setError('Kérlek add meg a neved!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { gameId, playerIndex, game } = await socketService.createGame(playerName.trim());
      console.log('Game created:', gameId);
      onGameStart({ gameId, playerIndex, playerName: playerName.trim(), game });
    } catch (err) {
      setError('Hiba történt a játék létrehozásakor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (gameId) => {
    if (!playerName.trim()) {
      setError('Kérlek add meg a neved!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { playerIndex, game } = await socketService.joinGame(gameId, playerName.trim());
      console.log('Joined game:', gameId);
      onGameStart({ gameId, playerIndex, playerName: playerName.trim(), game });
    } catch (err) {
      setError(err.message || 'Hiba történt a csatlakozáskor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-800 to-green-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-8">
          🎮 Tarokk Játék
        </h1>

        {/* Név megadás */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Neved:
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Add meg a neved..."
            disabled={loading}
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:border-blue-500 focus:outline-none transition-all"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateGame()}
          />
        </div>

        {/* Hiba üzenet */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Új játék létrehozása */}
        <div className="mb-6">
          <button
            onClick={handleCreateGame}
            disabled={loading || !playerName.trim()}
            className="w-full px-6 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 
                     disabled:cursor-not-allowed text-white font-bold text-lg rounded-lg 
                     transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {loading ? 'Létrehozás...' : '🎯 Új játék létrehozása'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            Hozz létre egy új 4 játékos tarokk játékot
          </p>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              vagy
            </span>
          </div>
        </div>

        {/* Meglévő játékhoz csatlakozás */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Csatlakozás játék ID-val:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={gameIdToJoin}
              onChange={(e) => setGameIdToJoin(e.target.value)}
              placeholder="Játék ID..."
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:border-green-500 focus:outline-none transition-all"
              onKeyPress={(e) => e.key === 'Enter' && gameIdToJoin && handleJoinGame(gameIdToJoin)}
            />
            <button
              onClick={() => handleJoinGame(gameIdToJoin)}
              disabled={loading || !playerName.trim() || !gameIdToJoin.trim()}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 
                       disabled:cursor-not-allowed text-white font-semibold rounded-lg 
                       transition-all shadow-md"
            >
              Csatlakozás
            </button>
          </div>
        </div>

        {/* Elérhető játékok listája */}
        {availableGames.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Elérhető játékok:
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableGames.map(game => {
                const connectedCount = game.players.filter(p => p.connected).length;
                const disconnectedCount = game.players.filter(p => p.disconnected).length;
                const waitingCount = game.players.filter(p => p.name === 'Várakozik...').length;
                
                return (
                  <div
                    key={game.id}
                    className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-between
                             hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer"
                    onClick={() => !loading && handleJoinGame(game.id)}
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {game.players.find(p => p.connected || p.name !== 'Várakozik...')?.name || 'Ismeretlen'} játéka
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {connectedCount}/4 játékos
                        {disconnectedCount > 0 && (
                          <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                            ({disconnectedCount} kilépett)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {game.status === 'waiting' ? '⏳ Várakozás...' : '🎮 Játék folyamatban'}
                      </p>
                    </div>
                    <button
                      disabled={loading}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300
                               text-white font-semibold rounded-lg transition-all"
                    >
                      {disconnectedCount > 0 ? 'Vissza' : 'Csatlakozás'}
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={fetchAvailableGames}
              className="mt-3 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
            >
              🔄 Frissítés
            </button>
          </div>
        )}

        {/* Információk */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            ℹ️ Játék információk
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• 4 játékos szükséges a játék indításához</li>
            <li>• 42 kártyás pakli (20 színes + 22 tarokk)</li>
            <li>• Licitálás, csere, játék fázisok</li>
            <li>• Real-time multiplayer Socket.io-val</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
