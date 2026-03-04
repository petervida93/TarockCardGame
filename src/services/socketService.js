import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.gameId = null;
    this.playerIndex = null;
  }

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('✓ Connected to game server');
    });

    this.socket.on('disconnect', () => {
      console.log('✗ Disconnected from game server');
    });

    this.socket.on('error', ({ message }) => {
      console.error('Socket error:', message);
      alert(message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Új játék létrehozása
  createGame(playerName) {
    return new Promise((resolve) => {
      this.socket.emit('create_game', { playerName });
      this.socket.once('game_created', ({ gameId, playerIndex, game }) => {
        this.gameId = gameId;
        this.playerIndex = playerIndex;
        resolve({ gameId, playerIndex, game });
      });
    });
  }

  // Játékhoz csatlakozás
  joinGame(gameId, playerName) {
    return new Promise((resolve, reject) => {
      this.socket.emit('join_game', { gameId, playerName });
      
      this.socket.once('game_joined', ({ gameId, playerIndex, game }) => {
        this.gameId = gameId;
        this.playerIndex = playerIndex;
        resolve({ gameId, playerIndex, game });
      });

      this.socket.once('error', ({ message }) => {
        reject(new Error(message));
      });
    });
  }

  // Licitálás
  bid(action, value = null) {
    this.socket.emit('bid', {
      gameId: this.gameId,
      playerIndex: this.playerIndex,
      action,
      value
    });
  }

  // Kártyalerakás (exchanging)
  discardCards(cards) {
    this.socket.emit('discard_cards', {
      gameId: this.gameId,
      playerIndex: this.playerIndex,
      cards
    });
  }

  // Csapattárs meghívása (calling)
  callPartner(calledTarockValue) {
    this.socket.emit('call_partner', {
      gameId: this.gameId,
      playerIndex: this.playerIndex,
      calledTarockValue
    });
  }

  // Bemondás (calling)
  makeAnnouncement(announcement) {
    this.socket.emit('make_announcement', {
      gameId: this.gameId,
      playerIndex: this.playerIndex,
      announcement
    });
  }

  // Calling fázis befejezése
  finishCalling() {
    this.socket.emit('finish_calling', {
      gameId: this.gameId,
      playerIndex: this.playerIndex
    });
  }

  // Kártya játszása
  playCard(card) {
    this.socket.emit('play_card', {
      gameId: this.gameId,
      playerIndex: this.playerIndex,
      card
    });
  }

  // Játék állapot lekérése
  getGameState() {
    this.socket.emit('get_game_state', {
      gameId: this.gameId,
      playerIndex: this.playerIndex
    });
  }

  // Event listeners
  onGameUpdated(callback) {
    this.socket.on('game_updated', callback);
  }

  onGameStarted(callback) {
    this.socket.on('game_started', callback);
  }

  onPlayerJoined(callback) {
    this.socket.on('player_joined', callback);
  }

  onPlayerDisconnected(callback) {
    this.socket.on('player_disconnected', callback);
  }

  onCardPlayed(callback) {
    this.socket.on('card_played', callback);
  }

  onCardsDiscarded(callback) {
    this.socket.on('cards_discarded', callback);
  }

  onPartnerCalled(callback) {
    this.socket.on('partner_called', callback);
  }

  onAnnouncementMade(callback) {
    this.socket.on('announcement_made', callback);
  }

  onGameFinished(callback) {
    this.socket.on('game_finished', callback);
  }

  onNewDealRequired(callback) {
    this.socket.on('new_deal_required', callback);
  }

  onGameState(callback) {
    this.socket.on('game_state', callback);
  }

  // Cleanup
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default new SocketService();
