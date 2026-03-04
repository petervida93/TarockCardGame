const { v4: uuidv4 } = require('uuid');

class GameController {
  constructor() {
    this.games = new Map(); // In-memory game storage (memóriában tároljuk a játékokat)
  }

  // 42 kártyás pakli létrehozása és keverése
  createAndShuffleDeck() {
    const deck = [];
    
    // Színes kártyák: 4 szín x 5 kártya = 20
    const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
    for (const suit of suits) {
      for (let value = 1; value <= 5; value++) {
        deck.push({ suit, value });
      }
    }
    
    // Tarokkok: 22 kártya (1-22)
    for (let value = 1; value <= 22; value++) {
      const isHonor = value === 1 || value === 21 || value === 22;
      deck.push({ suit: 'tarock', value, isHonor });
    }
    
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
  }

  // Kezdeti kiosztás
  initialDeal() {
    const deck = this.createAndShuffleDeck();
    const hands = [[], [], [], []];
    const talonCards = [];
    
    // 9-9 kártya minden játékosnak
    for (let i = 0; i < 9; i++) {
      for (let player = 0; player < 4; player++) {
        hands[player].push(deck[i * 4 + player]);
      }
    }
    
    // 6 kártya a talonnak
    for (let i = 36; i < 42; i++) {
      talonCards.push(deck[i]);
    }
    
    return { hands, talonCards };
  }

  // Kártyák rendezése
  sortCards(cards) {
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
  }

  // Honőrök ellenőrzése
  checkHonors(hand) {
    return hand.some(card => card.isHonor === true);
  }

  // Új játék létrehozása
  createGame(hostPlayerName) {
    const gameId = uuidv4();
    
    const game = {
      id: gameId,
      status: 'waiting', // waiting, bidding, exchanging, playing, finished
      dealerIndex: 0,
      currentPlayerIndex: 0, // Az első játékos (host) kezd
      currentBid: null,
      lastBidder: null,
      biddingWinner: null,
      consecutivePasses: 0,
      players: [
        { 
          id: 0, 
          name: hostPlayerName, 
          cardCount: 0, 
          hasHonor: false, 
          isBidding: false,
          socketId: null,
          disconnected: false
        },
        { id: 1, name: 'Várakozik...', cardCount: 0, hasHonor: false, isBidding: false, socketId: null, disconnected: false },
        { id: 2, name: 'Várakozik...', cardCount: 0, hasHonor: false, isBidding: false, socketId: null, disconnected: false },
        { id: 3, name: 'Várakozik...', cardCount: 0, hasHonor: false, isBidding: false, socketId: null, disconnected: false }
      ],
      hands: [[], [], [], []],
      talon: [],
      currentTrick: [],
      tricks: [],
      biddingHistory: [],
      talonDistribution: [0, 0, 0, 0],
      playersDiscarded: [false, false, false, false], // Ki rakta már le a kártyáit az exchanging fázisban
      leadSuit: null,
      trickStartPlayer: 0, // Az első játékos kezdi
      createdAt: Date.now()
    };
    
    this.games.set(gameId, game);
    return game;
  }

  // Játékhoz csatlakozás
  joinGame(gameId, playerName, socketId) {
    const game = this.games.get(gameId);
    if (!game) return { success: false, error: 'Game not found' };
    
    // Reconnect ellenőrzés: van-e már ilyen nevű játékos aki disconnected?
    const disconnectedPlayerIndex = game.players.findIndex(p => p.name === playerName && p.disconnected === true);
    if (disconnectedPlayerIndex !== -1) {
      // Reconnect
      game.players[disconnectedPlayerIndex].disconnected = false;
      game.players[disconnectedPlayerIndex].socketId = socketId;
      console.log(`Player ${playerName} reconnected to game ${gameId} as player ${disconnectedPlayerIndex}`);
      return { success: true, playerIndex: disconnectedPlayerIndex, game, reconnected: true };
    }
    
    // Ha nem reconnect, ellenőrizzük van-e szabad hely
    // Szabad hely lehet: waiting státuszban bármelyik üres slot, vagy disconnected játékos
    const disconnectedSlot = game.players.findIndex(p => p.disconnected === true);
    
    if (disconnectedSlot !== -1) {
      // Van disconnected játékos, új játékos csatlakozik a helyére
      const oldName = game.players[disconnectedSlot].name;
      game.players[disconnectedSlot].name = playerName;
      game.players[disconnectedSlot].disconnected = false;
      game.players[disconnectedSlot].socketId = socketId;
      console.log(`Player ${playerName} joined game ${gameId} replacing disconnected player ${oldName} at position ${disconnectedSlot}`);
      return { success: true, playerIndex: disconnectedSlot, game, replaced: true };
    }
    
    if (game.status !== 'waiting') {
      return { success: false, error: 'Game already started and no slots available' };
    }
    
    // Keressünk szabad helyet waiting játékban
    const emptySlot = game.players.findIndex(p => p.socketId === null && p.id > 0);
    if (emptySlot === -1) {
      return { success: false, error: 'Game is full' };
    }
    
    // Frissítsük a játékost
    game.players[emptySlot] = {
      id: emptySlot,
      name: playerName,
      cardCount: 0, // Még nincsenek kiosztva a kártyák
      hasHonor: false,
      isBidding: false,
      socketId: socketId,
      disconnected: false
    };
    
    // Ha mind a 4 játékos csatlakozott, osszuk ki a kártyákat és kezdődjön a licitálás
    if (game.players.every(p => p.socketId !== null)) {
      // Most osszuk ki a kártyákat a csatlakozási sorrend alapján
      const { hands, talonCards } = this.initialDeal();
      game.hands = hands.map(h => this.sortCards(h));
      game.talon = talonCards;
      
      // Frissítsük a játékosok adatait a kiosztott kártyák alapján
      for (let i = 0; i < 4; i++) {
        game.players[i].cardCount = 9;
        game.players[i].hasHonor = this.checkHonors(game.hands[i]);
      }
      
      game.status = 'bidding';
    }
    
    return { success: true, playerIndex: emptySlot, game };
  }

  // Kártya értéke
  getCardValue(card) {
    if (card.suit === 'tarock') {
      if (card.value === 1 || card.value === 21 || card.value === 22) {
        return 5; // Honőrök
      }
      return 1;
    }
    return card.value; // Színes lapok
  }

  // Talon kiosztása
  distributeTalonCards(gameId, winner, bidValue) {
    const game = this.games.get(gameId);
    if (!game) return { success: false, error: 'Game not found' };
    
    const talonCopy = [...game.talon];
    const distribution = [0, 0, 0, 0];
    
    if (bidValue === 3) {
      distribution[winner] = 3;
      for (let i = 0; i < 4; i++) {
        if (i !== winner) distribution[i] = 1;
      }
    } else if (bidValue === 2) {
      distribution[winner] = 2;
      distribution[(winner + 3) % 4] = 2;
      distribution[(winner + 2) % 4] = 1;
      distribution[(winner + 1) % 4] = 1;
    } else if (bidValue === 1) {
      distribution[winner] = 1;
      distribution[(winner + 3) % 4] = 2;
      distribution[(winner + 2) % 4] = 2;
      distribution[(winner + 1) % 4] = 1;
    } else if (bidValue === 0) {
      distribution[winner] = 0;
      for (let i = 0; i < 4; i++) {
        if (i !== winner) distribution[i] = 2;
      }
    }
    
    // Kártyák kiosztása
    let cardIndex = 0;
    for (let player = 0; player < 4; player++) {
      const numCards = distribution[player];
      const cardsForPlayer = talonCopy.slice(cardIndex, cardIndex + numCards);
      game.hands[player] = this.sortCards([...game.hands[player], ...cardsForPlayer]);
      game.players[player].cardCount += numCards;
      cardIndex += numCards;
    }
    
    game.talonDistribution = distribution;
    game.talon = [];
    
    return { success: true, distribution };
  }

  // Licitálás logika
  handleBid(gameId, playerIndex, action, value) {
    const game = this.games.get(gameId);
    if (!game) return { success: false, error: 'Game not found' };
    
    if (game.currentPlayerIndex !== playerIndex) {
      return { success: false, error: 'Not your turn' };
    }
    
    let newConsecutivePasses = game.consecutivePasses;
    
    if (action === 'bid') {
      game.currentBid = value;
      game.lastBidder = playerIndex;
      game.biddingHistory.push({ 
        player: game.players[playerIndex].name, 
        action: 'bid', 
        value, 
        bidValue: value, 
        playerIndex 
      });
      newConsecutivePasses = 0;
    } else if (action === 'hold') {
      game.lastBidder = playerIndex;
      game.biddingHistory.push({ 
        player: game.players[playerIndex].name, 
        action: 'hold', 
        bidValue: game.currentBid, 
        playerIndex 
      });
      newConsecutivePasses = 0;
    } else if (action === 'pass') {
      game.biddingHistory.push({ 
        player: game.players[playerIndex].name, 
        action: 'pass', 
        playerIndex 
      });
      newConsecutivePasses++;
    }
    
    game.consecutivePasses = newConsecutivePasses;
    
    // Licitálás vége ellenőrzés
    const biddingResult = this.checkBiddingEnd(game, newConsecutivePasses);
    if (biddingResult.endBidding) {
      if (biddingResult.newDeal) {
        return { success: true, endBidding: true, newDeal: true };
      }
      
      game.biddingWinner = game.lastBidder;
      this.distributeTalonCards(gameId, game.lastBidder, game.currentBid);
      game.status = 'exchanging';
      
      return { success: true, endBidding: true, newDeal: false, game };
    }
    
    // Következő játékos (óramutató járásával ellentétes)
    game.currentPlayerIndex = (game.currentPlayerIndex + 3) % 4;
    
    return { success: true, game };
  }

  // Licit vége ellenőrzés
  checkBiddingEnd(game, newConsecutivePasses) {
    if (newConsecutivePasses >= 4) {
      return { endBidding: true, newDeal: true };
    }
    
    if (newConsecutivePasses >= 3) {
      const hasBidOrHold = game.biddingHistory.some(h => h.action === 'bid' || h.action === 'hold');
      if (hasBidOrHold) {
        return { endBidding: true, newDeal: false };
      }
    }
    
    if (game.currentBid === 0) {
      const lastAction = game.biddingHistory[game.biddingHistory.length - 1];
      if (lastAction?.action === 'hold') {
        return { endBidding: true, newDeal: false };
      }
    }
    
    return { endBidding: false, newDeal: false };
  }

  // Kártyalerakás (exchanging)
  discardCards(gameId, playerIndex, cards) {
    const game = this.games.get(gameId);
    if (!game) return { success: false, error: 'Game not found' };
    
    // Ellenőrizzük, hogy ez a játékos már lerakta-e
    if (game.playersDiscarded[playerIndex]) {
      return { success: false, error: 'Already discarded cards' };
    }
    
    // Eltávolítjuk a kártyákat
    game.hands[playerIndex] = game.hands[playerIndex].filter(card => 
      !cards.some(c => c.suit === card.suit && c.value === card.value)
    );
    game.players[playerIndex].cardCount = game.hands[playerIndex].length;
    
    // Jelöljük, hogy ez a játékos lerakta
    game.playersDiscarded[playerIndex] = true;
    
    // Ha mindenki lerakta, kezdődhet a játék
    const allDiscarded = game.talonDistribution.every((dist, idx) => {
      return dist === 0 || game.playersDiscarded[idx];
    });
    
    if (allDiscarded) {
      game.status = 'playing';
      game.currentPlayerIndex = 0; // Az első játékos kezdi a playing fázist
    }
    
    return { success: true, game, allDiscarded };
  }

  // Játék a játék fázisban
  playCard(gameId, playerIndex, card) {
    const game = this.games.get(gameId);
    if (!game) return { success: false, error: 'Game not found' };
    
    if (game.currentPlayerIndex !== playerIndex) {
      return { success: false, error: 'Not your turn' };
    }
    
    // Validálás
    if (!this.canPlayCard(game, card, playerIndex)) {
      return { success: false, error: 'Cannot play this card' };
    }
    
    // Kártya hozzáadása az asztalhoz
    game.currentTrick.push({ playerIndex, card });
    
    // Első kártya -> vezető szín
    if (game.currentTrick.length === 1) {
      game.leadSuit = card.suit;
    }
    
    // Eltávolítjuk a kártyát
    game.hands[playerIndex] = game.hands[playerIndex].filter(c => 
      !(c.suit === card.suit && c.value === card.value)
    );
    game.players[playerIndex].cardCount--;
    
    // 4. kártya -> ütés vége
    if (game.currentTrick.length === 4) {
      const winner = this.determineWinner(game.currentTrick);
      game.tricks.push({ cards: game.currentTrick, winner });
      game.currentTrick = [];
      game.leadSuit = null;
      game.currentPlayerIndex = winner;
      
      // 9 ütés = játék vége
      if (game.tricks.length === 9) {
        game.status = 'finished';
      }
      
      return { success: true, trickComplete: true, winner, game };
    } else {
      // Következő játékos
      game.currentPlayerIndex = (game.currentPlayerIndex + 3) % 4;
    }
    
    return { success: true, trickComplete: false, game };
  }

  // Lehet-e rakni ezt a kártyát
  canPlayCard(game, card, playerIndex) {
    if (game.currentTrick.length === 0) return true;
    
    const leadCard = game.currentTrick[0].card;
    const ledSuit = leadCard.suit;
    const hand = game.hands[playerIndex];
    
    const hasSuit = hand.some(c => c.suit === ledSuit);
    if (hasSuit) {
      return card.suit === ledSuit;
    }
    
    if (ledSuit !== 'tarock') {
      const hasTarock = hand.some(c => c.suit === 'tarock');
      if (hasTarock) {
        return card.suit === 'tarock';
      }
    }
    
    return true;
  }

  // Ütés nyertese
  determineWinner(trick) {
    let winningPlay = trick[0];
    const leadCard = trick[0].card;
    const ledSuit = leadCard.suit;
    
    const hasTarock = trick.some(play => play.card.suit === 'tarock');
    
    if (hasTarock) {
      for (const play of trick) {
        if (play.card.suit === 'tarock') {
          if (winningPlay.card.suit !== 'tarock' || play.card.value > winningPlay.card.value) {
            winningPlay = play;
          }
        }
      }
    } else {
      for (const play of trick) {
        if (play.card.suit === ledSuit && play.card.value > winningPlay.card.value) {
          winningPlay = play;
        }
      }
    }
    
    return winningPlay.playerIndex;
  }

  // Pontszámítás
  calculateScores(gameId) {
    const game = this.games.get(gameId);
    if (!game) return null;
    
    const scores = [0, 0, 0, 0];
    
    game.tricks.forEach(trick => {
      const winner = trick.winner;
      trick.cards.forEach(play => {
        scores[winner] += this.getCardValue(play.card);
      });
    });
    
    return scores;
  }

  // Játék lekérése
  getGame(gameId) {
    return this.games.get(gameId);
  }

  // Játék törlése
  deleteGame(gameId) {
    return this.games.delete(gameId);
  }

  // Játékos keze (csak saját)
  getPlayerHand(gameId, playerIndex) {
    const game = this.games.get(gameId);
    if (!game) return null;
    return game.hands[playerIndex];
  }
}

module.exports = new GameController();
