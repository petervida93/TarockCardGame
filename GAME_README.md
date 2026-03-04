# Tarokk Játék UI

## Komponensek

### Card Component (`src/components/Card.jsx`)
Egyetlen kártya megjelenítésére szolgál.
- **Props:**
  - `card`: A kártya objektuma (suit, value, isHonor)
  - `onClick`: Kattintás esemény kezelő
  - `selectable`: Kiválasztható-e a kártya
  - `selected`: Ki van-e választva a kártya
  - `faceDown`: Hátlappal nézzen-e a kártya

### Player Component (`src/components/Player.jsx`)
Játékos avatárját és információit jeleníti meg.
- **Props:**
  - `player`: Játékos objektum (id, name, cardCount, hasHonor, isBidding)
  - `position`: Pozíció a táblán ('bottom', 'top', 'left', 'right')
  - `isCurrentPlayer`: Az aktuális játékos-e

### Hand Component (`src/components/Hand.jsx`)
Játékos kártyáit jeleníti meg.
- **Props:**
  - `cards`: Kártyák tömbje
  - `onCardClick`: Kártya kattintás kezelő
  - `selectedCards`: Kiválasztott kártyák tömbje
  - `position`: Pozíció a táblán

### Talon Component (`src/components/Talon.jsx`)
A talon kártyákat jeleníti meg (6 kártya).
- **Props:**
  - `cards`: Talon kártyák tömbje
  - `isRevealed`: Fel vannak-e fedve a kártyák
  - `onTalonClick`: Talon kártya kattintás kezelő

### BiddingPanel Component (`src/components/BiddingPanel.jsx`)
Licitálás panel a játékhoz.
- **Props:**
  - `currentBid`: Aktuális licit
  - `onBid`: Licitálás esemény kezelő
  - `isPlayerTurn`: A játékos körük van-e
  - `biddingHistory`: Licit történet tömbje

### GameBoard Component (`src/components/GameBoard.jsx`)
A teljes játéktábla, összeállítva az összes komponensből.
- 4 játékos, avatárokkal
- Minden játékos 9 kártyával
- Talon 6 kártyával
- Licitálás panel
- Játék állapot információk

## Játék Fázisok

1. **Licitálás (bidding)**: Játékosok licitálnak a talonért
2. **Csere (exchanging)**: A nyertes játékos cseréli a kártyáit a talonnal
3. **Játék (playing)**: A játék maga (később implementálva)

## Kártyák

- **Színes lapok**: 4 szín × 5 lap = 20 lap
  - clubs (treff)
  - diamonds (káró)
  - hearts (kőr)
  - spades (pikk)
  - Értékek: 1-5 (5 = király)

- **Tarokkok**: 22 lap (1-22)
  - Honőrök: 1, 21, 22 (skíz)

## Használat

```bash
npm run dev     # Dev szerver indítása
npm run build   # Production build
```

A játék elérhető: http://localhost:5173/
