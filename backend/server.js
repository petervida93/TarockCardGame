const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./db/database');
const gameController = require('./controllers/gameController');

const app = express();
const server = http.createServer(app);

// CORS konfiguráció
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Socket.io konfiguráció
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// REST API endpoints (opcionális, játéklistázáshoz stb.)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Tarock Backend Server Running' });
});

app.get('/api/games', (req, res) => {
  const games = Array.from(gameController.games.values())
    .filter(game => {
      // Csak azok a játékok, ahol lehet csatlakozni:
      // - waiting státuszú játékok
      // - vagy olyan játékok, ahol van disconnected játékos
      if (game.status === 'waiting') return true;
      return game.players.some(p => p.disconnected === true);
    })
    .map(game => ({
      id: game.id,
      status: game.status,
      players: game.players.map(p => ({ 
        name: p.name, 
        connected: !!p.socketId && !p.disconnected,
        disconnected: p.disconnected || false
      })),
      createdAt: game.createdAt
    }));
  res.json(games);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id}`);

  // Új játék létrehozása
  socket.on('create_game', ({ playerName }) => {
    try {
      const game = gameController.createGame(playerName);
      game.players[0].socketId = socket.id;
      socket.join(game.id);
      
      console.log(`Game created: ${game.id} by ${playerName}`);
      
      socket.emit('game_created', {
        gameId: game.id,
        playerIndex: 0,
        game: sanitizeGameForClient(game, 0)
      });
      
      io.to(game.id).emit('game_updated', sanitizeGameForClient(game, 0));
    } catch (error) {
      console.error('Error creating game:', error);
      socket.emit('error', { message: 'Failed to create game' });
    }
  });

  // Játékhoz csatlakozás
  socket.on('join_game', ({ gameId, playerName }) => {
    try {
      const result = gameController.joinGame(gameId, playerName, socket.id);
      
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }
      
      socket.join(gameId);
      console.log(`${playerName} joined game ${gameId} as player ${result.playerIndex}`);
      
      socket.emit('game_joined', {
        gameId,
        playerIndex: result.playerIndex,
        game: sanitizeGameForClient(result.game, result.playerIndex)
      });
      
      // Értesítjük az összes játékost
      io.to(gameId).emit('player_joined', {
        playerIndex: result.playerIndex,
        playerName: playerName
      });
      
      // Ha a játék elkezdődött (4 játékos), küldjük ki az updatet
      if (result.game.status === 'bidding') {
        io.to(gameId).emit('game_started', {});
        broadcastGameStateToAll(gameId);
      }
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', { message: 'Failed to join game' });
    }
  });

  // Licitálás
  socket.on('bid', ({ gameId, playerIndex, action, value }) => {
    try {
      const result = gameController.handleBid(gameId, playerIndex, action, value);
      
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }
      
      if (result.endBidding && result.newDeal) {
        io.to(gameId).emit('new_deal_required', { 
          message: 'Mind a 4 játékos passzolt. Új osztás következik.' 
        });
        setTimeout(() => {
          gameController.deleteGame(gameId);
        }, 3000);
        return;
      }
      
      broadcastGameStateToAll(gameId);
    } catch (error) {
      console.error('Error handling bid:', error);
      socket.emit('error', { message: 'Failed to process bid' });
    }
  });

  // Kártyalerakás (exchanging fázis)
  socket.on('discard_cards', ({ gameId, playerIndex, cards }) => {
    try {
      const result = gameController.discardCards(gameId, playerIndex, cards);
      
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }
      
      io.to(gameId).emit('cards_discarded', { playerIndex });
      broadcastGameStateToAll(gameId);
    } catch (error) {
      console.error('Error discarding cards:', error);
      socket.emit('error', { message: 'Failed to discard cards' });
    }
  });

  // Kártyajátszás (playing fázis)
  socket.on('play_card', ({ gameId, playerIndex, card }) => {
    try {
      const result = gameController.playCard(gameId, playerIndex, card);
      
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }
      
      io.to(gameId).emit('card_played', { 
        playerIndex, 
        card,
        trickComplete: result.trickComplete,
        winner: result.winner
      });
      
      broadcastGameStateToAll(gameId);
      
      // Ha a játék véget ért
      if (result.game.status === 'finished') {
        const scores = gameController.calculateScores(gameId);
        io.to(gameId).emit('game_finished', { scores });
      }
    } catch (error) {
      console.error('Error playing card:', error);
      socket.emit('error', { message: 'Failed to play card' });
    }
  });

  // Játék állapotának lekérése
  socket.on('get_game_state', ({ gameId, playerIndex }) => {
    try {
      const game = gameController.getGame(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      
      socket.emit('game_state', sanitizeGameForClient(game, playerIndex));
    } catch (error) {
      console.error('Error getting game state:', error);
      socket.emit('error', { message: 'Failed to get game state' });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id}`);
    
    // Keressük meg, melyik játékban volt
    for (const [gameId, game] of gameController.games) {
      const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        const playerName = game.players[playerIndex].name;
        
        // Jelöljük disconnected-ként, de ne töröljük
        game.players[playerIndex].disconnected = true;
        game.players[playerIndex].socketId = null;
        
        console.log(`Player ${playerName} (index ${playerIndex}) disconnected from game ${gameId}`);
        
        io.to(gameId).emit('player_disconnected', { 
          playerIndex, 
          playerName
        });
        
        // Ha a játék még várakozó állapotban van és MINDENKI kilépett, töröljük
        if (game.status === 'waiting' && game.players.every(p => p.disconnected || p.name === 'Várakozik...')) {
          console.log(`All players disconnected from waiting game ${gameId}, deleting...`);
          gameController.deleteGame(gameId);
        }
      }
    }
  });
});

// Helper függvény: Játék állapot sanitizálása kliensnek
// Minden játékos csak a saját kártyáit látja
function sanitizeGameForClient(game, playerIndex) {
  return {
    id: game.id,
    status: game.status,
    dealerIndex: game.dealerIndex,
    currentPlayerIndex: game.currentPlayerIndex,
    currentBid: game.currentBid,
    lastBidder: game.lastBidder,
    biddingWinner: game.biddingWinner,
    consecutivePasses: game.consecutivePasses,
    players: game.players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      cardCount: p.cardCount,
      hasHonor: idx === playerIndex ? p.hasHonor : undefined, // Csak saját honőr látható
      isBidding: p.isBidding,
      disconnected: p.disconnected || false
    })),
    hand: game.hands[playerIndex], // Csak saját kéz
    talon: game.talon.length, // Csak a darabszám
    currentTrick: game.currentTrick,
    tricks: game.tricks,
    biddingHistory: game.biddingHistory,
    talonDistribution: game.talonDistribution,
    playersDiscarded: game.playersDiscarded || [false, false, false, false],
    leadSuit: game.leadSuit,
    trickStartPlayer: game.trickStartPlayer
  };
}

// Broadcast minden játékosnak egyéni nézettel
function broadcastGameStateToAll(gameId) {
  const game = gameController.getGame(gameId);
  if (!game) return;
  
  game.players.forEach((player, idx) => {
    if (player.socketId) {
      io.to(player.socketId).emit('game_updated', sanitizeGameForClient(game, idx));
    }
  });
}

// Server indítás
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`\n🎮 Tarock Backend Server`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   CORS Origin: ${process.env.CORS_ORIGIN}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    sequelize.close();
  });
});
