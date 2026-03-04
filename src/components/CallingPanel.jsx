import { useState } from 'react';
import PropTypes from 'prop-types';

const CallingPanel = ({ onCallPartner, isPlayerTurn, playerHand, biddingWinner, onMakeAnnouncement, onFinishCalling }) => {
  const [step, setStep] = useState('partner'); // 'partner' or 'announcements'
  const [announcements, setAnnouncements] = useState([]);
  
  // Automatikus tarokk kiválasztás: legmagasabb elérhető hívható tarokk ami NINCS a játékosnál
  const getAvailableTarocks = () => {
    const playerTarocksSet = new Set(
      playerHand
        .filter(card => card.suit === 'tarock')
        .map(card => card.value)
    );
    
    // Hívható tarokkok: 20, 19, 18, 17, 16
    const callableTarocks = [20, 19, 18, 17, 16];
    
    // Azok a tarokkok, amelyek NINCSENEK a játékosnál
    return callableTarocks.filter(value => !playerTarocksSet.has(value));
  };

  const availableTarocks = getAvailableTarocks();

  const handlePartnerSelect = (value) => {
    onCallPartner(value);
    setStep('announcements');
  };

  const handleAnnouncementToggle = (type, suit = null) => {
    const existing = announcements.findIndex(a => a.type === type && a.suit === suit);
    if (existing === -1) {
      setAnnouncements([...announcements, { type, suit }]);
    } else {
      setAnnouncements(announcements.filter((_, i) => i !== existing));
    }
  };

  const handleFinish = () => {
    // Minden bemondást elküldjük
    announcements.forEach(ann => {
      onMakeAnnouncement(ann);
    });
    onFinishCalling();
  };

  const announcementTypes = [
    { type: 'negykiraly', label: 'Négy király', points: 1, description: 'Mind a 4 királyt elvisszük' },
    { type: 'tuletroa', label: 'Tuletróá', points: 1, description: 'Mindhárom honőrt elvisszük' },
    { type: 'duplajat', label: 'Dupla játék', points: 2, description: 'Pártipontjaink legalább 2x annyiak' },
    { type: 'pagat_ulti', label: 'Pagát ulti', points: 10, description: 'Utolsó ütést pagáttal viszem' },
    { type: 'sas_ulti', label: 'Sas ulti', points: 10, description: 'Utolsó ütést 2-es tarokkal viszem' },
    { type: 'kiraly_ulti', label: 'Király ulti', points: 15, description: 'Utolsó ütést megnevezett királlyal viszem', needsSuit: true },
    { type: 'pagat_uhu', label: 'Pagát uhu', points: 8, description: '8. ütést pagáttal viszem' },
    { type: 'sas_uhu', label: 'Sas uhu', points: 8, description: '8. ütést 2-es tarokkal viszem' },
    { type: 'kiraly_uhu', label: 'Király uhu', points: 12, description: '8. ütést megnevezett királlyal viszem', needsSuit: true }
  ];

  // Nincs hívható tarokk (mind nálunk van)
  if (availableTarocks.length === 0 && step === 'partner') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            ⚠️ Nincs hívható tarokk
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Az összes hívható tarokk (20, 19, 18, 17, 16) nálad van. Egyedül játszol!
          </p>
          <button
            onClick={() => {
              onCallPartner(null);
              setStep('announcements');
            }}
            className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-all"
          >
            Folytatás
          </button>
        </div>
      </div>
    );
  }

  if (!isPlayerTurn) {
    return (
      <div className="fixed bottom-4 right-4 bg-yellow-100 dark:bg-yellow-900 rounded-xl shadow-lg p-4 max-w-sm z-40">
        <p className="text-yellow-800 dark:text-yellow-200 font-semibold">
          ⏳ {biddingWinner} csapattársat hív és bemondásokat tesz...
        </p>
      </div>
    );
  }

  // Csapattárs választás lépés
  if (step === 'partner') {
    const recommendedTarock = availableTarocks[0];
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            🤝 Csapattárs meghívása
          </h2>
          
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Válaszd ki, melyik tarokkal rendelkező játékos legyen a csapattársad!
          </p>

          <div className="space-y-3">
            {availableTarocks.map((value) => (
              <button
                key={value}
                onClick={() => handlePartnerSelect(value)}
                className={`w-full px-6 py-4 rounded-lg font-bold text-lg transition-all
                  ${value === recommendedTarock 
                    ? 'bg-green-500 hover:bg-green-600 text-white ring-2 ring-green-300' 
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                  }`}
              >
                Segít a {value}-as tarokk
                {value === recommendedTarock && ' ✨ (Ajánlott)'}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
            A legmagasabb elérhető tarokk az ajánlott választás
          </p>
        </div>
      </div>
    );
  }

  // Bemondások lépés
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-2xl w-full my-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          📢 Bemondások
        </h2>
        
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Válassz bemondásokat, amiket vállalsz. Ha nem teljesíted, minusz pont!
        </p>

        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
          {announcementTypes.map((ann) => {
            const isSelected = announcements.some(a => a.type === ann.type);
            
            if (ann.needsSuit) {
              // Király ulti/uhu - külön gomb minden színhez
              const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
              const suitNames = { clubs: 'Treff', diamonds: 'Káró', hearts: 'Kőr', spades: 'Pikk' };
              
              return (
                <div key={ann.type} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  <div className="font-semibold text-gray-900 dark:text-white mb-2">
                    {ann.label} (+{ann.points} pont)
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{ann.description}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {suits.map(suit => {
                      const isSuitSelected = announcements.some(a => a.type === ann.type && a.suit === suit);
                      return (
                        <button
                          key={suit}
                          onClick={() => handleAnnouncementToggle(ann.type, suit)}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all
                            ${isSuitSelected
                              ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                            }`}
                        >
                          {suitNames[suit]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }
            
            return (
              <button
                key={ann.type}
                onClick={() => handleAnnouncementToggle(ann.type)}
                className={`w-full px-6 py-4 rounded-lg font-bold text-left transition-all
                  ${isSelected
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg">{ann.label}</div>
                    <div className={`text-sm ${isSelected ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                      {ann.description}
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                    +{ann.points}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setStep('partner')}
            className="px-6 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-bold rounded-lg transition-all"
          >
            ← Vissza
          </button>
          <button
            onClick={handleFinish}
            className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-all"
          >
            Játék indítása ({announcements.length} bemondás)
          </button>
        </div>
      </div>
    </div>
  );
};

CallingPanel.propTypes = {
  onCallPartner: PropTypes.func.isRequired,
  isPlayerTurn: PropTypes.bool.isRequired,
  playerHand: PropTypes.arrayOf(
    PropTypes.shape({
      suit: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired
    })
  ).isRequired,
  biddingWinner: PropTypes.string.isRequired,
  onMakeAnnouncement: PropTypes.func.isRequired,
  onFinishCalling: PropTypes.func.isRequired
};

export default CallingPanel;
