# 🎮 Tarokk Card Game

Real-time multiplayer Tarokk card game built with React, Express.js, Socket.io, and PostgreSQL.

## 🏗️ Architecture

```
Tarock/
├── backend/               # Express.js + Socket.io Backend
│   ├── controllers/       # Game logic controllers
│   ├── db/               # Database schema & migrations
│   ├── server.js         # Main server file
│   └── package.json
├── src/                  # React Frontend
│   ├── components/       # React components
│   ├── services/         # Socket.io client service
│   └── ...
├── docker-compose.yml    # Docker setup
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (optional but recommended)

### Option 1: With Docker (Recommended)

1. **Start the backend with PostgreSQL:**
   ```bash
   docker-compose up -d
   ```

2. **Install frontend dependencies and start:**
   ```bash
   npm install
   npm run dev
   ```

3. **Open your browser:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

### Option 2: Without Docker

1. **Setup PostgreSQL manually:**
   - Install PostgreSQL 15
   - Create database: `tarock_db`
   - Run init script: `backend/db/init.sql`

2. **Start Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Start Frontend:**
   ```bash
   npm install
   npm run dev
   ```

## 🎯 Features

### Implemented ✅
- Full 42-card Tarokk deck (4 suits × 5 + 22 tarocks)
- Real-time multiplayer (4 players via WebSocket)
- Complete bidding system with Hungarian rules
- Automatic talon distribution
- Trick-taking gameplay with suit-following rules
- Expandable trick history
- Game state management

### Backend Features
- Express.js REST API
- Socket.io real-time communication
- PostgreSQL database
- In-memory game state management
- Player session handling
- Docker containerization

## 🎲 Game Rules

### Játék menete
1. **Licitálás** - Honor kártyával (1-es, 21-es, 22-es tarokk) lehet licitálni
2. **Csere** - Talon kártyák kiosztása és lerakás
3. **Játék** - 9 ütés, színre kötelezett szabályokkal
4. **Értékelés** - Pontszámítás

### Licit típusok
- **Három** (3 lap a talonból)
- **Kettő** (2 lap a talonból)
- **Egy** (1 lap a talonból)
- **Szóló** (0 lap a talonból)

## 🔌 API & Socket Events

### Socket.io Events (Backend → Client)
- `game_created` - Új játék létrehozva
- `game_joined` - Csatlakozás sikerült
- `game_updated` - Játék állapot frissült
- `game_started` - Játék elkezdődött
- `player_joined` - Új játékos csatlakozott
- `player_disconnected` - Játékos kilépett
- `card_played` - Kártya lerakva
- `cards_discarded` - Kártyák eldobva
- `game_finished` - Játék véget ért

### REST API Endpoints
- `GET /api/health` - Server health check
- `GET /api/games` - List all games

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS 3** - Styling
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js 18** - Runtime
- **Express.js** - Web framework
- **Socket.io** - WebSocket server
- **PostgreSQL 15** - Database
- **Sequelize** - ORM
- **Docker** - Containerization

## 📝 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://tarock_user:tarock_password@localhost:5432/tarock_db
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```env
VITE_SOCKET_URL=http://localhost:3001
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild backend
docker-compose up -d --build backend
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint Code

```bash
npm run lint
```

## Tech Stack

- React 18
- Vite 6
- ESLint
