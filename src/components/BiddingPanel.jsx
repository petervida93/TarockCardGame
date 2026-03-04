import { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const BiddingPanel = ({ currentBid, onBid, isPlayerTurn, biddingHistory = [], playerHasHonor = false, playerIndex }) => {
  const historyEndRef = useRef(null);
  
  // Auto-scroll a történet végére
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [biddingHistory]);
  
  const bids = [
    { name: 'Három', value: 3, description: '3 lap a talonból' },
    { name: 'Kettő', value: 2, description: '2 lap a talonból' },
    { name: 'Egy', value: 1, description: '1 lap a talonból' },
    { name: 'Szóló', value: 0, description: '0 lap a talonból' }
  ];

  // Ellenőrzi, hogy a játékos passzolt-e már
  const hasPlayerPassed = () => {
    return biddingHistory.some(entry => entry.playerIndex === playerIndex && entry.action === 'pass');
  };

  const canBid = (bidValue) => {
    if (!isPlayerTurn) return false;
    // Csak honőrrel lehet licitálni
    if (!playerHasHonor) return false;
    // Ha már passzolt, nem licitálhat többet
    if (hasPlayerPassed()) return false;
    if (!currentBid) return true;
    return bidValue < currentBid;
  };

  const canHold = () => {
    if (!isPlayerTurn || currentBid === null) return false;
    
    // Csak honőrrel lehet tartani
    if (!playerHasHonor) return false;
    
    // Ha már passzolt, nem tarthat többet
    if (hasPlayerPassed()) return false;
    
    // Nem lehet tartani, ha valaki már tartotta az aktuális licitet
    const alreadyHeld = biddingHistory.some(
      entry => entry.action === 'hold' && entry.bidValue === currentBid
    );
    
    if (alreadyHeld) {
      return false;
    }
    
    return true;
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Licitálás
      </h3>

      {/* Honőr figyelmeztetés */}
      {!playerHasHonor && isPlayerTurn && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          <p className="text-sm text-yellow-900 dark:text-yellow-100">
            ⚠️ Nincs honőröd (1-es, 21-es vagy 22-es tarokk), ezért csak passzolhatsz.
          </p>
        </div>
      )}

      {/* Current bid display */}
      {currentBid !== null && (
        <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Aktuális licit: <span className="font-bold">
              {bids.find(b => b.value === currentBid)?.name || 'Nincs'}
            </span>
          </p>
        </div>
      )}

      {/* Bidding buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {bids.map((bid) => (
          <button
            key={bid.value}
            onClick={() => onBid('bid', bid.value)}
            disabled={!canBid(bid.value)}
            className={`
              px-4 py-3 rounded-lg font-semibold transition-all
              ${canBid(bid.value)
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <div className="text-lg">{bid.name}</div>
            <div className="text-xs opacity-80">{bid.description}</div>
          </button>
        ))}
      </div>

      {/* Hold and Pass buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onBid('hold')}
          disabled={!canHold()}
          className={`
            px-4 py-2 rounded-lg font-semibold transition-all
            ${canHold()
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Tartom
        </button>
        <button
          onClick={() => onBid('pass')}
          disabled={!isPlayerTurn}
          className={`
            px-4 py-2 rounded-lg font-semibold transition-all
            ${isPlayerTurn
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Passz
        </button>
      </div>

      {/* Bidding history */}
      {biddingHistory.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Licit történet:
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {biddingHistory.map((entry, index) => (
              <div
                key={index}
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                <span className="font-semibold">{entry.player}:</span>{' '}
                {entry.action === 'bid' && `${bids.find(b => b.value === entry.value)?.name}`}
                {entry.action === 'hold' && 'Tartom'}
                {entry.action === 'pass' && 'Passz'}
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};

BiddingPanel.propTypes = {
  currentBid: PropTypes.number,
  onBid: PropTypes.func.isRequired,
  isPlayerTurn: PropTypes.bool.isRequired,
  biddingHistory: PropTypes.arrayOf(
    PropTypes.shape({
      player: PropTypes.string,
      action: PropTypes.string,
      value: PropTypes.number,
      playerIndex: PropTypes.number
    })
  ),
  playerHasHonor: PropTypes.bool,
  playerIndex: PropTypes.number.isRequired
};

export default BiddingPanel;
