import { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import Player from './Player';
import Hand from './Hand';
import Talon from './Talon';
import BiddingPanel from './BiddingPanel';
import Card from './Card';

const GameBoardMultiplayer = ({ gameId, playerIndex, playerName, initialGame }) => {
  // Game state érkezik a szerverről
  const [game, setGame] = useState(initialGame);
  const [selectedCards, setSelectedCards] = useState([]);
  const [waitingMessage, setWaitingMessage] = useState('');
  const [expandedPlayers, setExpandedPlayers] = useState(new Set());

  useEffect(() => {
    // Socket event listeners
    socketService.onGameUpdated(handleGameUpdate);
    socketService.onGameStarted(handleGameStarted);
    socketService.onPlayerJoined(handlePlayerJoined);
    socketService.onPlayerDisconnected(handlePlayerDisconnected);
    socketService.onCardPlayed(handleCardPlayed);
    socketService.onCardsDiscarded(handleCardsDiscarded);
    socketService.onGameFinished(handleGameFinished);
    socketService.onNewDealRequired(handleNewDealRequired);

    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  const handleGameUpdate = (updatedGame) => {
    console.log('Game updated:', updatedGame);
    setGame(updatedGame);
    setWaitingMessage('');
  };

  const handleGameStarted = () => {
    setWaitingMessage('');
    console.log('Game started!');
  };

  const handlePlayerJoined = ({ playerIndex: joinedIndex, playerName }) => {
    console.log(`${playerName} joined as player ${joinedIndex}`);
  };

  const handlePlayerDisconnected = ({ playerName }) => {
    setWaitingMessage(`${playerName} kilépett a játékból`);
  };

  const handleCardPlayed = ({ playerIndex: playedIndex, card }) => {
    console.log(`Player ${playedIndex} played card:`, card);
  };

  const handleCardsDiscarded = ({ playerIndex: discardedIndex }) => {
    console.log(`Player ${discardedIndex} discarded cards`);
  };

  const handleGameFinished = ({ scores }) => {
    console.log('Game finished! Scores:', scores);
  };

  const handleNewDealRequired = ({ message }) => {
    alert(message);
    setTimeout(() => {
      globalThis.location.reload();
    }, 2000);
  };

  // Licitálás
  const handleBid = (action, value) => {
    socketService.bid(action, value);
  };

  // Kártyalerakás (exchanging)
  const handleDiscardCards = () => {
    // Ellenőrizzük, hogy már leraktuk-e
    if (game.playersDiscarded?.[playerIndex]) {
      alert('Már leraktad a kártyáidat!');
      return;
    }
    
    const cardsToDiscard = game.talonDistribution[playerIndex];
    
    if (selectedCards.length !== cardsToDiscard) {
      alert(`Pontosan ${cardsToDiscard} lapot kell letenned!`);
      return;
    }

    socketService.discardCards(selectedCards);
    setSelectedCards([]);
  };

  // Kártya kattintás
  const handleCardClick = (card) => {
    // Playing fázis
    if (game.status === 'playing') {
      if (game.currentPlayerIndex !== playerIndex) {
        alert('Nem te következel!');
        return;
      }
      socketService.playCard(card);
      return;
    }

    // Exchanging fázis
    if (game.status === 'exchanging') {
      // Ellenőrizzük, hogy ennek a játékosnak kell-e lerakni kártyát
      if (game.talonDistribution[playerIndex] === 0) return;
      
      // Ellenőrizzük, hogy már leraktuk-e
      if (game.playersDiscarded?.[playerIndex]) return;

      // Király ellenőrzés
      if (card.suit !== 'tarock' && card.value === 5) {
        alert('Királyt nem lehet lerakni!');
        return;
      }

      const isSelected = selectedCards.some(
        c => c.suit === card.suit && c.value === card.value
      );

      if (isSelected) {
        setSelectedCards(selectedCards.filter(
          c => !(c.suit === card.suit && c.value === card.value)
        ));
      } else {
        const cardsToDiscard = game.talonDistribution[playerIndex];
        if (selectedCards.length < cardsToDiscard) {
          setSelectedCards([...selectedCards, card]);
        }
      }
    }
  };

  // Kártyák rendezése
  const sortCards = (cards) => {
    if (!cards) return [];
    const suitOrder = {
      'clubs': 0,
      'diamonds': 1,
      'hearts': 2,
      'spades': 3,
      'tarock': 4
    };

    return [...cards].sort((a, b) => {
      const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
      if (suitDiff !== 0) return suitDiff;
      return a.value - b.value;
    });
  };

  // Relatív pozíció számítás a játékos szemszögéből
  const getRelativePlayerIndex = (position) => {
    // position: 'bottom' (én), 'right' (következő), 'top' (szemben), 'left' (előttem)
    const positionOffsets = {
      'bottom': 0,
      'right': 1,  // óramutató járásával ellentétes irányban következő
      'top': 2,    // szemben
      'left': 3    // előttem (hátrafelé számolva)
    };
    return (playerIndex + positionOffsets[position]) % 4;
  };

  // Scores számítás
  const calculateScores = () => {
    if (!game.tricks) return [0, 0, 0, 0];
    
    const scores = [0, 0, 0, 0];
    game.tricks.forEach(trick => {
      const winner = trick.winner;
      trick.cards.forEach(play => {
        const card = play.card;
        let value = 0;
        if (card.suit === 'tarock') {
          value = (card.value === 1 || card.value === 21 || card.value === 22) ? 5 : 1;
        } else {
          value = card.value;
        }
        scores[winner] += value;
      });
    });
    
    return scores;
  };

  const togglePlayerExpansion = (index) => {
    setExpandedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-800 to-green-900 flex items-center justify-center">
        <div className="text-white text-2xl">Játék betöltése...</div>
      </div>
    );
  }

  // Várakozás másik játékosokra
  if (game.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-800 to-green-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
            Várakozás játékosokra...
          </h2>
          
          <div className="space-y-3 mb-6">
            {game.players.map((player, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg ${
                  player.name === 'Várakozik...' 
                    ? 'bg-gray-200 dark:bg-gray-700' 
                    : 'bg-green-100 dark:bg-green-900'
                }`}
              >
                <p className="font-semibold text-gray-900 dark:text-white">
                  {idx + 1}. {player.name}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-200 text-center">
              Játék ID: <span className="font-mono font-bold">{gameId}</span>
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 text-center mt-2">
              Oszd meg ezt az ID-t barátaiddal!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const playerHand = sortCards(game.hand || []);
  const players = game.players || [];
  
  // Relatív játékosok pozícionálása
  const bottomPlayerIndex = getRelativePlayerIndex('bottom');
  const rightPlayerIndex = getRelativePlayerIndex('right');
  const topPlayerIndex = getRelativePlayerIndex('top');
  const leftPlayerIndex = getRelativePlayerIndex('left');
  
  // Játék véget ért? Ne mutassunk hátsó kártyákat
  const showCards = game.status !== 'finished';
  
  const otherPlayersHands = [
    showCards ? new Array(players[rightPlayerIndex]?.cardCount ?? 9).fill({ suit: 'back', value: 0 }) : [],
    showCards ? new Array(players[topPlayerIndex]?.cardCount ?? 9).fill({ suit: 'back', value: 0 }) : [],
    showCards ? new Array(players[leftPlayerIndex]?.cardCount ?? 9).fill({ suit: 'back', value: 0 }) : []
  ];

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-green-700 via-green-800 to-green-900 overflow-hidden">
      {/* Game table */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[90%] h-[80%] bg-green-600/30 rounded-[50%] border-8 border-green-800/50 shadow-2xl" />
      </div>

      {/* Players */}
      <Player player={players[bottomPlayerIndex]} position="bottom" isCurrentPlayer={game.currentPlayerIndex === bottomPlayerIndex} />
      <Player player={players[leftPlayerIndex]} position="left" isCurrentPlayer={game.currentPlayerIndex === leftPlayerIndex} />
      <Player player={players[topPlayerIndex]} position="top" isCurrentPlayer={game.currentPlayerIndex === topPlayerIndex} />
      <Player player={players[rightPlayerIndex]} position="right" isCurrentPlayer={game.currentPlayerIndex === rightPlayerIndex} />

      {/* Hands */}
      <Hand 
        cards={playerHand} 
        position="bottom" 
        onCardClick={handleCardClick}
        selectedCards={selectedCards}
      />
      <Hand cards={otherPlayersHands[2]} position="left" />
      <Hand cards={otherPlayersHands[1]} position="top" />
      <Hand cards={otherPlayersHands[0]} position="right" />

      {/* Talon */}
      {game.talon > 0 && (
        <Talon 
          cards={[{ suit: 'back', value: 0 }]} 
          isRevealed={false}
          onTalonClick={() => {}}
        />
      )}

      {/* Current trick */}
      {game.status === 'playing' && game.currentTrick && game.currentTrick.length > 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative w-64 h-64">
            {game.currentTrick.map((play, index) => {
              // Relatív pozíció meghatározása: ki játszotta le a lapot a saját szemszögemből nézve?
              let relativePosition;
              if (play.playerIndex === bottomPlayerIndex) relativePosition = 'bottom';
              else if (play.playerIndex === rightPlayerIndex) relativePosition = 'right';
              else if (play.playerIndex === topPlayerIndex) relativePosition = 'top';
              else if (play.playerIndex === leftPlayerIndex) relativePosition = 'left';
              
              const positionStyles = {
                'bottom': { bottom: 0, left: '50%', transform: 'translateX(-50%)' },
                'left': { left: 0, top: '50%', transform: 'translateY(-50%)' },
                'top': { top: 0, left: '50%', transform: 'translateX(-50%)' },
                'right': { right: 0, top: '50%', transform: 'translateY(-50%)' }
              };
              
              const position = positionStyles[relativePosition];
              
              return (
                <div key={index} className="absolute" style={position}>
                  <Card card={play.card} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bidding Panel */}
      {game.status === 'bidding' && (
        <BiddingPanel
          currentBid={game.currentBid}
          onBid={handleBid}
          isPlayerTurn={game.currentPlayerIndex === playerIndex}
          biddingHistory={game.biddingHistory || []}
          playerHasHonor={players[playerIndex]?.hasHonor || false}
        />
      )}

      {/* Game info */}
      <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg p-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Tarokk Játék
        </h2>
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <p>Te vagy: <span className="font-semibold">{playerName}</span></p>
          <p>Fázis: <span className="font-semibold">
            {game.status === 'bidding' ? 'Licitálás' : 
             game.status === 'exchanging' ? 'Csere' : 
             game.status === 'playing' ? 'Játék' : 'Befejezett'}
          </span></p>
          <p>Aktuális játékos: <span className="font-semibold">
            {players[game.currentPlayerIndex]?.name || 'Ismeretlen'}
          </span></p>
          {waitingMessage && (
            <p className="text-yellow-600 dark:text-yellow-400 font-semibold">
              ⏳ {waitingMessage}
            </p>
          )}
        </div>
      </div>

      {/* Exchange cards panel - Kártya lerakás */}
      {game.status === 'exchanging' && game.talonDistribution[playerIndex] > 0 && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md z-40">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Kártya lerakása
          </h3>
          
          {/* Játékosok státusza */}
          <div className="mb-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Játékosok:</p>
            {players.map((player, idx) => {
              const needsToDiscard = game.talonDistribution[idx] > 0;
              const hasDiscarded = game.playersDiscarded?.[idx];
              
              return (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{player.name}</span>
                  <span className={`font-semibold ${
                    !needsToDiscard ? 'text-gray-400' : 
                    hasDiscarded ? 'text-green-600 dark:text-green-400' : 
                    'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {!needsToDiscard ? 'Nem kell' : hasDiscarded ? '✓ Lerakta' : '⏳ Vár'}
                  </span>
                </div>
              );
            })}
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Tedd le pontosan <span className="font-bold text-blue-600">{game.talonDistribution[playerIndex]}</span> kártyát.
            <br />
            Kiválasztva: <span className="font-bold">{selectedCards.length}/{game.talonDistribution[playerIndex]}</span>
          </p>
          
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <p className="text-xs text-yellow-900 dark:text-yellow-100">
              ⚠️ Királyt (5-ös lap) nem lehet lerakni.
            </p>
          </div>
          
          <button
            onClick={handleDiscardCards}
            disabled={selectedCards.length !== game.talonDistribution[playerIndex] || game.playersDiscarded?.[playerIndex]}
            className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 
                     disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
          >
            {game.playersDiscarded?.[playerIndex] ? 
              '✓ Leraktad - Várakozás...' : 
              `Lapok lerakása (${selectedCards.length}/${game.talonDistribution[playerIndex]})`
            }
          </button>
        </div>
      )}

      {/* Várakozási info overlay - Akiknek nem kell lerakni */}
      {game.status === 'exchanging' && game.talonDistribution[playerIndex] === 0 && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                        bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-2xl p-8 max-w-md z-40 backdrop-blur-sm border-2 border-blue-500">
          <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-4">
            ⏳ Várakozás
          </h3>
          
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Neked nem kell kártyát lerakni.<br />
            Várakozás a többi játékosra...
          </p>
          
          {/* Játékosok státusza */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-center mb-2">
              Státusz:
            </p>
            {players.map((player, idx) => {
              const needsToDiscard = game.talonDistribution[idx] > 0;
              const hasDiscarded = game.playersDiscarded?.[idx];
              
              return (
                <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{player.name}</span>
                  <span className={`font-semibold ${
                    !needsToDiscard ? 'text-gray-400' : 
                    hasDiscarded ? 'text-green-600 dark:text-green-400' : 
                    'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {!needsToDiscard ? 'Nem kell' : hasDiscarded ? '✓ Kész' : '⏳ Játszik...'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Finished - Final scores */}
      {game.status === 'finished' && (() => {
        const scores = calculateScores();
        
        return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-4xl w-full mx-4 my-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
              Játék vége - Összesítő
            </h2>
            
            <div className="space-y-4 mb-6">
              {players.map((player, index) => {
                const playerScore = scores[index];
                const playerTricks = (game.tricks || []).filter(t => t.winner === index);
                const isExpanded = expandedPlayers.has(index);
                
                return (
                  <div 
                    key={player.id}
                    className={`rounded-lg ${
                      index === game.biddingWinner 
                        ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500' 
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-opacity-80 transition-all"
                      onClick={() => togglePlayerExpansion(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                            index === 0 ? 'bg-blue-500' :
                            index === 1 ? 'bg-green-500' :
                            index === 2 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}>
                            {player.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-lg text-gray-900 dark:text-white">
                              {player.name}
                              {index === game.biddingWinner && (
                                <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                                  (Licit nyertes)
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {playerTricks.length} ütés
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                              {playerScore}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              pont
                            </p>
                          </div>
                          <svg 
                            className={`w-6 h-6 text-gray-600 dark:text-gray-400 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && playerTricks.length > 0 && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-300 dark:border-gray-600 pt-3">
                        {playerTricks.map((trick, trickIdx) => {
                          const trickNumber = game.tricks.indexOf(trick) + 1;
                          const trickValue = trick.cards.reduce((sum, tc) => {
                            const card = tc.card;
                            let value = 0;
                            if (card.suit === 'tarock') {
                              value = (card.value === 1 || card.value === 21 || card.value === 22) ? 5 : 1;
                            } else {
                              value = card.value;
                            }
                            return sum + value;
                          }, 0);
                          
                          return (
                            <div key={trickIdx} className="bg-white dark:bg-gray-900 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  {trickNumber}. ütés
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {trickValue} pont
                                </p>
                              </div>
                              <div className="flex gap-2 justify-center flex-wrap">
                                {trick.cards.map((tc, cardIdx) => (
                                  <div key={cardIdx} className="relative">
                                    <Card 
                                      card={tc.card} 
                                      size="small"
                                    />
                                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded ${
                                      tc.playerIndex === 0 ? 'bg-blue-500' :
                                      tc.playerIndex === 1 ? 'bg-green-500' :
                                      tc.playerIndex === 2 ? 'bg-yellow-500' : 'bg-red-500'
                                    } text-white`}>
                                      {players[tc.playerIndex].name.charAt(0)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center">
              <button
                onClick={() => globalThis.location.reload()}
                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all shadow-lg"
              >
                Új játék
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default GameBoardMultiplayer;
