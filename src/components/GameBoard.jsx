import { useState, useEffect } from 'react';
import Player from './Player';
import Hand from './Hand';
import Talon from './Talon';
import BiddingPanel from './BiddingPanel';
import Card from './Card';

const GameBoard = () => {
  // 42 kártyás pakli létrehozása és kiosztása
  const createAndShuffleDeck = () => {
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
    
    // Keverés (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
  };

  // Kártyák rendezése: színek szerint érték alapján, majd tarokkok érték szerint
  const sortCards = (cards) => {
    const suitOrder = {
      'clubs': 0,
      'diamonds': 1,
      'hearts': 2,
      'spades': 3,
      'tarock': 4
    };

    return [...cards].sort((a, b) => {
      // Először színek szerint rendezünk
      const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
      if (suitDiff !== 0) return suitDiff;
      
      // Azonos színen belül érték szerint növekvő sorrendben
      return a.value - b.value;
    });
  };

  // Kezdeti kiosztás
  const initialDeal = () => {
    const deck = createAndShuffleDeck();
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
  };

  const { hands: initialHands, talonCards: initialTalon } = initialDeal();

  // Ellenőrizzük a honőröket az inicializáláshoz
  const checkHonors = (hand) => {
    return hand.some(card => card.isHonor === true);
  };

  const [players, setPlayers] = useState([
    { id: 0, name: 'Te', cardCount: 9, hasHonor: checkHonors(initialHands[0]), isBidding: false },
    { id: 1, name: 'Játékos 2', cardCount: 9, hasHonor: checkHonors(initialHands[1]), isBidding: false },
    { id: 2, name: 'Játékos 3', cardCount: 9, hasHonor: checkHonors(initialHands[2]), isBidding: false },
    { id: 3, name: 'Játékos 4', cardCount: 9, hasHonor: checkHonors(initialHands[3]), isBidding: false }
  ]);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(1); // Az osztó utáni játékos kezd
  const [gamePhase, setGamePhase] = useState('bidding'); // 'bidding', 'exchanging', 'playing', 'finished'
  const [currentBid, setCurrentBid] = useState(null);
  const [lastBidder, setLastBidder] = useState(null); // Ki licitált utoljára
  const [biddingHistory, setBiddingHistory] = useState([]);
  const [consecutivePasses, setConsecutivePasses] = useState(0);
  const [biddingWinner, setBiddingWinner] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [cardsToDiscard, setCardsToDiscard] = useState(0); // Hány lapot kell letenni
  const [dealerIndex] = useState(0); // Az osztó indexe
  const [talonDistribution, setTalonDistribution] = useState([0, 0, 0, 0]); // Ki mennyi lapot kapott a talonból
  
  // Playing phase states
  const [currentTrick, setCurrentTrick] = useState([]); // Az asztalon lévő kártyák [{playerIndex, card}, ...]
  const [leadSuit, setLeadSuit] = useState(null); // Milyen színnel vezettek
  const [tricks, setTricks] = useState([]); // Összegyűjtött ütések
  const [trickStartPlayer, setTrickStartPlayer] = useState(1); // Ki kezdi az ütést (osztó utáni)
  
  // Final summary states
  const [expandedPlayers, setExpandedPlayers] = useState(new Set()); // Melyik játékosok legyenek kinyitva

  // Kártyák minden játékosnak
  const [playerHand, setPlayerHand] = useState(sortCards(initialHands[0]));
  const [aiHands, setAiHands] = useState([
    sortCards(initialHands[1]),
    sortCards(initialHands[2]),
    sortCards(initialHands[3])
  ]);

  const [talon, setTalon] = useState(initialTalon);

  const [otherPlayersHands, setOtherPlayersHands] = useState([
    new Array(9).fill({ suit: 'back', value: 0 }),
    new Array(9).fill({ suit: 'back', value: 0 }),
    new Array(9).fill({ suit: 'back', value: 0 })
  ]);

  // Kártyák értékének számítása
  const getCardValue = (card) => {
    if (card.suit === 'tarock') {
      // Honőrök: 1, 21, 22 = 5 pont
      if (card.value === 1 || card.value === 21 || card.value === 22) {
        return 5;
      }
      return 1; // Egyéb tarokkok
    }
    // Színes lapok: értékük = pontjuk
    return card.value;
  };

  // AI intelligens kártyaválasztás az exchanging fázisban
  const selectCardsToDiscard = (hand, numCards) => {
    if (numCards === 0) return [];
    
    const cards = [...hand];
    const selected = [];
    
    // 1. Próbáljunk színtelenitést (egy szíből az összeset)
    const suitCounts = {};
    cards.forEach(card => {
      if (card.suit !== 'tarock') {
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
      }
    });
    
    // Keressünk olyan színt amiből pont numCards darab van
    for (const [suit, count] of Object.entries(suitCounts)) {
      if (count === numCards) {
        return cards.filter(c => c.suit === suit).slice(0, numCards);
      }
    }
    
    // 2. Ha nem megy színtelenités, a legkisebb értékű lapokat
    const sortedByValue = [...cards].sort((a, b) => {
      // Királyokat (5-ös színes) NEM rakhatunk le
      const aKing = a.suit !== 'tarock' && a.value === 5;
      const bKing = b.suit !== 'tarock' && b.value === 5;
      
      if (aKing && !bKing) return 1; // a utánra
      if (!aKing && bKing) return -1; // b utánra
      
      return getCardValue(a) - getCardValue(b);
    });
    
    for (const card of sortedByValue) {
      // Királyokat nem rakhatunk le
      if (card.suit !== 'tarock' && card.value === 5) continue;
      
      selected.push(card);
      if (selected.length === numCards) break;
    }
    
    return selected;
  };

  // Talon kiosztása a licit szerint
  const distributeTalonCards = (winner, bidValue) => {
    const talonCopy = [...talon];
    const distribution = [0, 0, 0, 0]; // Hány lapot kap minden játékos
    
    if (bidValue === 3) {
      // 3-as játék: nyertes 3 lap, többiek 1-1 lap
      distribution[winner] = 3;
      for (let i = 0; i < 4; i++) {
        if (i !== winner) distribution[i] = 1;
      }
    } else if (bidValue === 2) {
      // 2-es játék: nyertes 2 lap, következő 2 lap, továbbiak 1-1
      distribution[winner] = 2;
      distribution[(winner + 3) % 4] = 2;
      distribution[(winner + 2) % 4] = 1;
      distribution[(winner + 1) % 4] = 1;
    } else if (bidValue === 1) {
      // 1-es játék: nyertes 1 lap, következő két játékos 2-2 lap, negyedik 1
      distribution[winner] = 1;
      distribution[(winner + 3) % 4] = 2;
      distribution[(winner + 2) % 4] = 2;
      distribution[(winner + 1) % 4] = 1;
    } else if (bidValue === 0) {
      // Szóló: nyertes 0 lap, többiek 2-2 lap
      distribution[winner] = 0;
      for (let i = 0; i < 4; i++) {
        if (i !== winner) distribution[i] = 2;
      }
    }
    
    // Kiosztjuk a kártyákat
    let cardIndex = 0;
    const cardsForPlayers = [[], [], [], []];
    
    for (let player = 0; player < 4; player++) {
      const numCards = distribution[player];
      cardsForPlayers[player] = talonCopy.slice(cardIndex, cardIndex + numCards);
      cardIndex += numCards;
    }
    
    // Hozzáadjuk a kártyákat a játékos kezéhez (player 0 = Te)
    setPlayerHand(sortCards([...playerHand, ...cardsForPlayers[0]]));
    
    // Frissítjük az AI játékosok kezét
    setAiHands(prevHands => prevHands.map((hand, i) => 
      sortCards([...hand, ...cardsForPlayers[i + 1]])
    ));
    
    // Frissítjük az other players hands display-t
    setOtherPlayersHands(prevHands => prevHands.map((hand, i) => 
      new Array(9 + distribution[i + 1]).fill({ suit: 'back', value: 0 })
    ));
    
    // Frissítjük a játékosok kártyaszámát
    setPlayers(prevPlayers => prevPlayers.map((p, i) => ({
      ...p,
      cardCount: p.cardCount + distribution[i]
    })));
    
    // MINDENKI lerak ugyanannyi lapot, amennyit kapott
    // Csak a nyertes esetében van speciális cardsToDiscard állítás
    setCardsToDiscard(distribution[0]); // Player 0 (Te) számára
    setTalonDistribution(distribution); // Tároljuk mindenkinek
    
    // Töröljük a talont
    setTalon([]);
  };

  // Licit vége ellenőrzés
  const checkBiddingEnd = (newHistory, newConsecutivePasses) => {
    // 4 egymást követő passz = új osztás (nincs érvényes licit)
    if (newConsecutivePasses >= 4) {
      return { endBidding: true, newDeal: true };
    }
    
    // 3 egymást követő passz CSAK HA már volt licitálás (bid vagy hold)
    if (newConsecutivePasses >= 3) {
      // Ellenőrizzük, hogy volt-e már licitálás vagy tartás
      const hasBidOrHold = newHistory.some(h => h.action === 'bid' || h.action === 'hold');
      if (hasBidOrHold) {
        return { endBidding: true, newDeal: false };
      }
    }
    
    // Valaki szólót tartott
    if (currentBid === 0) {
      const lastAction = newHistory[newHistory.length - 1];
      if (lastAction?.action === 'hold') {
        return { endBidding: true, newDeal: false };
      }
    }
    
    return { endBidding: false, newDeal: false };
  };

  const handleBid = (action, value) => {
    const currentPlayer = players[currentPlayerIndex];
    
    let newHistory = [...biddingHistory];
    let newConsecutivePasses = consecutivePasses;
    let newLastBidder = lastBidder;
    
    if (action === 'bid') {
      setCurrentBid(value);
      newLastBidder = currentPlayerIndex;
      setLastBidder(newLastBidder);
      newHistory.push({ player: currentPlayer.name, action: 'bid', value, bidValue: value, playerIndex: currentPlayerIndex });
      newConsecutivePasses = 0;
    } else if (action === 'hold') {
      newLastBidder = currentPlayerIndex;
      setLastBidder(newLastBidder);
      newHistory.push({ player: currentPlayer.name, action: 'hold', bidValue: currentBid, playerIndex: currentPlayerIndex });
      newConsecutivePasses = 0;
    } else if (action === 'pass') {
      newHistory.push({ player: currentPlayer.name, action: 'pass', playerIndex: currentPlayerIndex });
      newConsecutivePasses++;
    }
    
    setBiddingHistory(newHistory);
    setConsecutivePasses(newConsecutivePasses);
    
    // Ellenőrizzük, hogy vége van-e a licitálásnak
    const biddingResult = checkBiddingEnd(newHistory, newConsecutivePasses);
    if (biddingResult.endBidding) {
      if (biddingResult.newDeal) {
        // 4 passz = új osztás
        alert('Mind a 4 játékos passzolt. Új osztás következik.');
        globalThis.location.reload();
        return;
      }
      
      // Meghatározzuk a nyertest (az utolsó aki licitált vagy tartott)
      setBiddingWinner(newLastBidder);
      
      // Automatikusan kiosztjuk a talon kártyákat
      distributeTalonCards(newLastBidder, currentBid);
      
      setGamePhase('exchanging');
      return;
    }
    
    // Következő játékos (óramutató járásával ellentétes)
    const nextPlayerIndex = (currentPlayerIndex + 3) % 4;
    setCurrentPlayerIndex(nextPlayerIndex);
  };

  // Játék fázis logika
  const canPlayCard = (card, playerIndex) => {
    // Ha első kártya az ütésben, bármit lehet rakni
    if (currentTrick.length === 0) return true;
    
    // Milyen színt vezettek
    const leadCard = currentTrick[0].card;
    const ledSuit = leadCard.suit;
    
    // Van-e a játékosnak a vezetett színből
    const hand = playerIndex === 0 ? playerHand : aiHands[playerIndex - 1];
    const hasSuit = hand.some(c => c.suit === ledSuit);
    
    if (hasSuit) {
      // Ha van, akkor csak azt a színt rakhad
      return card.suit === ledSuit;
    }
    
    // Ha nincs a vezetett színből, akkor tarokkot kell rakni ha van
    if (ledSuit !== 'tarock') {
      const hasTarock = hand.some(c => c.suit === 'tarock');
      if (hasTarock) {
        return card.suit === 'tarock';
      }
    }
    
    // Ha nincs se a vezetett szín, se tarokk, bármit lehet rakni
    return true;
  };

  const getPlayRestrictionReason = (card) => {
    if (currentTrick.length === 0) return '';
    
    const leadCard = currentTrick[0].card;
    const ledSuit = leadCard.suit;
    const hasSuit = playerHand.some(c => c.suit === ledSuit);
    
    if (hasSuit && card.suit !== ledSuit) {
      return 'Színre színt kötelező!';
    }
    
    if (ledSuit !== 'tarock') {
      const hasTarock = playerHand.some(c => c.suit === 'tarock');
      if (hasTarock && card.suit !== 'tarock' && card.suit !== ledSuit) {
        return 'Ha nincs a vezetett színből, tarokkot kötelező rakni!';
      }
    }
    
    return '';
  };

  const determineWinner = (trick) => {
    // trick = [{playerIndex, card}, ...]
    let winningPlay = trick[0];
    const leadCard = trick[0].card;
    const ledSuit = leadCard.suit;
    
    // Van-e tarokk az ütésben
    const hasTarock = trick.some(play => play.card.suit === 'tarock');
    
    if (hasTarock) {
      // Ha van tarokk, a legnagyobb tarokk üti
      for (const play of trick) {
        if (play.card.suit === 'tarock') {
          if (winningPlay.card.suit !== 'tarock' || play.card.value > winningPlay.card.value) {
            winningPlay = play;
          }
        }
      }
    } else {
      // Ha nincs tarokk, a vezetett színből a legnagyobb üti
      for (const play of trick) {
        if (play.card.suit === ledSuit && play.card.value > winningPlay.card.value) {
          winningPlay = play;
        }
      }
    }
    
    return winningPlay.playerIndex;
  };

  const playCard = (playerIndex, card) => {
    // Hozzáadjuk a kártyát az asztalhoz
    const newTrick = [...currentTrick, { playerIndex, card }];
    setCurrentTrick(newTrick);
    
    // Ha ez az első kártya, beállítjuk a vezető színt
    if (currentTrick.length === 0) {
      setLeadSuit(card.suit);
    }
    
    // Eltávolítjuk a kártyát a játékos kezéből
    if (playerIndex === 0) {
      const newHand = playerHand.filter(c => 
        !(c.suit === card.suit && c.value === card.value)
      );
      setPlayerHand(sortCards(newHand));
    } else {
      // AI játékos kezéből töröljük
      setAiHands(prevHands => prevHands.map((hand, i) => {
        if (i === playerIndex - 1) {
          return hand.filter(c => !(c.suit === card.suit && c.value === card.value));
        }
        return hand;
      }));
      
      // Frissítjük az other players hands display-t
      setOtherPlayersHands(prevHands => prevHands.map((hand, i) => {
        if (i === playerIndex - 1) {
          return new Array(hand.length - 1).fill({ suit: 'back', value: 0 });
        }
        return hand;
      }));
    }
    
    // Frissítjük a játékos kártyaszámát
    setPlayers(prevPlayers => prevPlayers.map((p, i) => 
      i === playerIndex ? { ...p, cardCount: p.cardCount - 1 } : p
    ));
    
    // Ha ez volt a 4. kártya, kiértékeljük az ütést
    if (newTrick.length === 4) {
      setTimeout(() => {
        const winner = determineWinner(newTrick);
        const newTricks = [...tricks, { cards: newTrick, winner }];
        setTricks(newTricks);
        setCurrentTrick([]);
        setLeadSuit(null);
        setTrickStartPlayer(winner);
        setCurrentPlayerIndex(winner);
        
        // Ellenőrizzük, hogy vége van-e a játéknak (9 ütés = minden kártya lejátszva)
        if (newTricks.length === 9) {
          setTimeout(() => {
            setGamePhase('finished');
          }, 2000);
        }
      }, 1500); // 1.5 másodperc várakozás, hogy lássuk az ütést
    } else {
      // Következő játékos (óramutató járásával ellentétes)
      setCurrentPlayerIndex((currentPlayerIndex + 3) % 4);
    }
  };

  // Játék fázisban kártya kattintás
  const handlePlayCard = (card) => {
    if (gamePhase !== 'playing') return;
    if (currentPlayerIndex !== 0) return; // Csak a játékos választhat
    
    // Validáljuk, hogy rakhato-e ez a kártya
    if (!canPlayCard(card, 0)) {
      const reason = getPlayRestrictionReason(card);
      alert(reason);
      return;
    }
    
    // Lejátsszuk a kártyát
    playCard(0, card);
  };

  const handleCardClick = (card) => {
    if (gamePhase === 'playing') {
      handlePlayCard(card);
      return;
    }
    
    if (gamePhase !== 'exchanging') return;
    if (biddingWinner !== 0) return; // Csak a játékos választhat
    
    // Ellenőrizzük, hogy nem király-e (5-ös értékű színes lap)
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
      // Maximum annyit választhat, amennyit kapott
      if (selectedCards.length < cardsToDiscard) {
        setSelectedCards([...selectedCards, card]);
      }
    }
  };

  const handleDiscardCards = () => {
    if (selectedCards.length !== cardsToDiscard) {
      alert(`Pontosan ${cardsToDiscard} lapot kell letenned!`);
      return;
    }
    
    // Eltávolítjuk a kiválasztott kártyákat a kézből
    const newHand = playerHand.filter(card => 
      !selectedCards.some(selected => 
        selected.suit === card.suit && selected.value === card.value
      )
    );
    
    setPlayerHand(sortCards(newHand));
    setSelectedCards([]);
    setCardsToDiscard(0);
    
    // Frissítsük a játékos kártyaszámát
    setPlayers(prevPlayers => prevPlayers.map((p, i) => 
      i === 0 ? { ...p, cardCount: newHand.length } : p
    ));
    
    // Tovább a játékra
    setGamePhase('playing');
    // Az osztó utáni játékos kezd
    setCurrentPlayerIndex(1);
    setTrickStartPlayer(1);
  };

  useEffect(() => {
    // Update current bidding player
    setPlayers(prevPlayers => prevPlayers.map((p, i) => ({
      ...p,
      isBidding: i === currentPlayerIndex && gamePhase === 'bidding'
    })));
  }, [currentPlayerIndex, gamePhase]);

  // AI játékosok licitálása
  useEffect(() => {
    if (gamePhase !== 'bidding') return;
    if (currentPlayerIndex === 0) return; // Ha a játékos jön, ne csináljunk semmit
    
    // AI játékos licitálása késleltetéssel (1-2 másodperc)
    const delay = 1000 + Math.random() * 1000;
    const timeoutId = setTimeout(() => {
      const player = players[currentPlayerIndex];
      
      // Ellenőrizzük, hogy ez az AI játékos passzolt-e már
      const hasPassedAlready = biddingHistory.some(
        entry => entry.playerIndex === currentPlayerIndex && entry.action === 'pass'
      );
      
      // Ha már passzolt vagy nincs honőrje, csak passzolhat
      if (!player.hasHonor || hasPassedAlready) {
        handleBid('pass');
        return;
      }
      
      // Ellenőrizzük, hogy az előző akció tartás volt-e
      const lastAction = biddingHistory.length > 0 ? biddingHistory[biddingHistory.length - 1] : null;
      const wasLastActionHold = lastAction?.action === 'hold';
      
      // Random döntés AI számára
      const random = Math.random();
      
      if (currentBid === null) {
        // Ha még senki nem licitált, 40% esély hogy licitáljon
        if (random < 0.4) {
          handleBid('bid', 3); // Három-mal kezd
        } else {
          handleBid('pass');
        }
      } else if (random < 0.3 && currentBid > 0) {
        // Licitál alacsonyabbat
        handleBid('bid', currentBid - 1);
      } else if (random < 0.5 && lastBidder !== null && lastBidder !== currentPlayerIndex && !wasLastActionHold) {
        // Tartja a licitet - DE csak ha az előző akció NEM volt tartás
        handleBid('hold');
      } else {
        handleBid('pass');
      }
    }, delay);
    
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayerIndex, gamePhase]);

  // AI játékosok lapot raknak a playing fázisban
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    if (currentPlayerIndex === 0) return; // Ha a játékos jön, ne csináljunk semmit
    if (currentTrick.length === 4) return; // Ha már mind a 4 kártya kint van
    
    // AI játékos lapot rak késleltetéssel
    const delay = 800 + Math.random() * 800;
    const timeoutId = setTimeout(() => {
      const aiHandIndex = currentPlayerIndex - 1;
      const aiHand = aiHands[aiHandIndex];
      
      if (!aiHand || aiHand.length === 0) return;
      
      let cardToPlay = null;
      
      // Ha van vezető szín, próbáljunk szabályosan játszani
      if (currentTrick.length > 0) {
        const leadCard = currentTrick[0].card;
        const ledSuit = leadCard.suit;
        
        // Keressünk megfelelő színű kártyát
        const sameSuitCards = aiHand.filter(c => c.suit === ledSuit);
        if (sameSuitCards.length > 0) {
          cardToPlay = sameSuitCards[Math.floor(Math.random() * sameSuitCards.length)];
        } else {
          // Ha nincs, tarokkot próbálunk
          const tarockCards = aiHand.filter(c => c.suit === 'tarock');
          if (tarockCards.length > 0 && ledSuit !== 'tarock') {
            cardToPlay = tarockCards[Math.floor(Math.random() * tarockCards.length)];
          } else {
            // Ha nincs tarokk sem, bármit rakunk
            cardToPlay = aiHand[Math.floor(Math.random() * aiHand.length)];
          }
        }
      } else {
        // Első láp, bármit rakhat
        cardToPlay = aiHand[Math.floor(Math.random() * aiHand.length)];
      }
      
      if (cardToPlay) {
        playCard(currentPlayerIndex, cardToPlay);
      }
    }, delay);
    
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayerIndex, gamePhase, currentTrick]);

  // AI játékosok kártyalerakása az exchanging fázisban
  useEffect(() => {
    if (gamePhase !== 'exchanging') return;
    
    // AI játékosok (1, 2, 3) párhuzamosan lerakják a kártyáikat
    const delays = [1500, 1800, 2100]; // Különböző késleltetések
    const timeoutIds = [];
    
    aiHands.forEach((hand, aiIndex) => {
      const playerIndex = aiIndex + 1; // 1, 2, 3
      const numToDiscard = talonDistribution[playerIndex];
      
      if (numToDiscard === 0) return; // Nem kell lerakni
      
      const delay = delays[aiIndex] + Math.random() * 500;
      const timeoutId = setTimeout(() => {
        // Intelligensen választjuk ki a lerakandó kártyákat
        const cardsToRemove = selectCardsToDiscard(hand, numToDiscard);
        
        // Eltávolítjuk a kiválasztott kártyákat az AI kezéből
        setAiHands(prevHands => prevHands.map((h, i) => {
          if (i === aiIndex) {
            return h.filter(card => 
              !cardsToRemove.some(removed => 
                removed.suit === card.suit && removed.value === card.value
              )
            );
          }
          return h;
        }));
        
        // Frissítjük az other players hands display-t
        setOtherPlayersHands(prevHands => prevHands.map((h, i) => {
          if (i === aiIndex) {
            return new Array(h.length - numToDiscard).fill({ suit: 'back', value: 0 });
          }
          return h;
        }));
        
        // Frissítjük a játékos kártyaszámát
        setPlayers(prevPlayers => prevPlayers.map((p, i) => {
          if (i === playerIndex) {
            return { ...p, cardCount: p.cardCount - numToDiscard };
          }
          return p;
        }));
      }, delay);
      
      timeoutIds.push(timeoutId);
    });
    
    // Várunk amíg minden AI befejezi, majd továbblépünk
    // (ha a játékos már befejezte a saját kártyalerakását vagy nem kellett neki)
    const maxDelay = Math.max(...delays) + 1000;
    const finalTimeout = setTimeout(() => {
      // Csak akkor lépünk tovább ha a játékos is befejezte
      if (cardsToDiscard === 0) {
        setGamePhase('playing');
        setCurrentPlayerIndex(1);
        setTrickStartPlayer(1);
      }
    }, maxDelay);
    
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      clearTimeout(finalTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase]);

  // Pontszámítás a végén
  const calculateScores = () => {
    const scores = [0, 0, 0, 0];
    
    tricks.forEach(trick => {
      const winner = trick.winner;
      trick.cards.forEach(play => {
        scores[winner] += getCardValue(play.card);
      });
    });
    
    return scores;
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-green-700 via-green-800 to-green-900 overflow-hidden">
      {/* Game table */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[90%] h-[80%] bg-green-600/30 rounded-[50%] border-8 border-green-800/50 shadow-2xl" />
      </div>

      {/* Players */}
      <Player player={players[0]} position="bottom" isCurrentPlayer={currentPlayerIndex === 0} />
      <Player player={players[1]} position="left" isCurrentPlayer={currentPlayerIndex === 1} />
      <Player player={players[2]} position="top" isCurrentPlayer={currentPlayerIndex === 2} />
      <Player player={players[3]} position="right" isCurrentPlayer={currentPlayerIndex === 3} />

      {/* Hands */}
      <Hand 
        cards={playerHand} 
        position="bottom" 
        onCardClick={handleCardClick}
        selectedCards={selectedCards}
      />
      <Hand cards={otherPlayersHands[0]} position="left" />
      <Hand cards={otherPlayersHands[1]} position="top" />
      <Hand cards={otherPlayersHands[2]} position="right" />

      {/* Talon */}
      {talon.length > 0 && (
        <Talon 
          cards={talon} 
          isRevealed={false}
          onTalonClick={() => {}}
        />
      )}

      {/* Current trick - kártyák az asztalon */}
      {gamePhase === 'playing' && currentTrick.length > 0 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative w-64 h-64">
            {currentTrick.map((play, index) => {
              // Pozíció az asztalon: bottom, left, top, right
              const positions = [
                { bottom: 0, left: '50%', transform: 'translateX(-50%)' }, // bottom (player 0)
                { left: 0, top: '50%', transform: 'translateY(-50%)' }, // left (player 1)
                { top: 0, left: '50%', transform: 'translateX(-50%)' }, // top (player 2)
                { right: 0, top: '50%', transform: 'translateY(-50%)' } // right (player 3)
              ];
              
              const position = positions[play.playerIndex];
              
              return (
                <div
                  key={index}
                  className="absolute"
                  style={position}
                >
                  <Card card={play.card} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bidding Panel */}
      {gamePhase === 'bidding' && (
        <BiddingPanel
          currentBid={currentBid}
          onBid={handleBid}
          isPlayerTurn={currentPlayerIndex === 0}
          biddingHistory={biddingHistory}
          playerHasHonor={players[0].hasHonor}
        />
      )}

      {/* Game info */}
      <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg p-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Tarokk Játék
        </h2>
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <p>Fázis: <span className="font-semibold">
            {gamePhase === 'bidding' ? 'Licitálás' : 
             gamePhase === 'exchanging' ? 'Csere' : 'Játék'}
          </span></p>
          <p>Aktuális játékos: <span className="font-semibold">
            {players[currentPlayerIndex].name}
          </span></p>
          {gamePhase === 'bidding' && (
            <>
              <p>Egymást követő passzok: <span className="font-semibold">{consecutivePasses}/3</span></p>
              {currentBid !== null && (
                <p>Jelenlegi licit: <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {currentBid === 3 ? 'Három' : currentBid === 2 ? 'Kettő' : currentBid === 1 ? 'Egy' : 'Szóló'}
                </span></p>
              )}
            </>
          )}
          {gamePhase === 'exchanging' && biddingWinner !== null && (
            <p>Licit nyertes: <span className="font-semibold text-green-600 dark:text-green-400">
              {players[biddingWinner].name}
            </span></p>
          )}
          {selectedCards.length > 0 && (
            <p className="text-blue-600 dark:text-blue-400">
              Kiválasztva: {selectedCards.length} kártya
            </p>
          )}
        </div>
      </div>

      {/* Exchange cards panel */}
      {gamePhase === 'exchanging' && biddingWinner === 0 && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Kártya lerakása
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {cardsToDiscard > 0 ? (
              <>
                Tedd le pontosan <span className="font-bold text-blue-600">{cardsToDiscard}</span> kártyát.
                <br />
                Kiválasztva: <span className="font-bold">{selectedCards.length}/{cardsToDiscard}</span>
              </>
            ) : (
              'Szóló - nem kell kártyát lerakni.'
            )}
          </p>
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <p className="text-xs text-yellow-900 dark:text-yellow-100">
              ⚠️ Királyt (5-ös lap) nem lehet lerakni. Tarokkot lehet, de fel kell fedni.
            </p>
          </div>
          <button
            onClick={handleDiscardCards}
            disabled={selectedCards.length !== cardsToDiscard}
            className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
          >
            Lapok lerakása ({selectedCards.length}/{cardsToDiscard})
          </button>
        </div>
      )}
      
      {gamePhase === 'exchanging' && biddingWinner !== 0 && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Kártya lerakása
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {players[biddingWinner].name} rakja le a kártyáit...
          </p>
        </div>
      )}

      {/* Finished - Final scores */}
      {gamePhase === 'finished' && (() => {
        const scores = calculateScores();
        
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
        
        return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-4xl w-full mx-4 my-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
              Játék vége - Összesítő
            </h2>
            
            <div className="space-y-4 mb-6">
              {players.map((player, index) => {
                const playerScore = scores[index];
                const playerTricks = tricks.filter(t => t.winner === index);
                const isExpanded = expandedPlayers.has(index);
                
                return (
                  <div 
                    key={player.id}
                    className={`rounded-lg ${
                      index === biddingWinner 
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
                              {index === biddingWinner && (
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
                    
                    {/* Expandált ütések részlet */}
                    {isExpanded && playerTricks.length > 0 && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-300 dark:border-gray-600 pt-3">
                        {playerTricks.map((trick, trickIdx) => {
                          const trickNumber = tricks.indexOf(trick) + 1;
                          const trickValue = trick.cards.reduce((sum, tc) => sum + getCardValue(tc.card), 0);
                          
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

export default GameBoard;
