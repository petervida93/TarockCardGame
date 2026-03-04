-- Tarock Game Database Schema

CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- waiting, bidding, exchanging, playing, finished
    dealer_index INTEGER NOT NULL DEFAULT 0,
    current_player_index INTEGER NOT NULL DEFAULT 1,
    current_bid INTEGER,
    bidding_winner INTEGER,
    consecutive_passes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    player_index INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    card_count INTEGER DEFAULT 9,
    has_honor BOOLEAN DEFAULT FALSE,
    is_bidding BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, player_index)
);

CREATE TABLE IF NOT EXISTS game_state (
    id SERIAL PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE UNIQUE,
    player_hands JSONB NOT NULL, -- {0: [...cards], 1: [...cards], ...}
    talon JSONB NOT NULL DEFAULT '[]',
    current_trick JSONB NOT NULL DEFAULT '[]', -- [{playerIndex, card}, ...]
    tricks JSONB NOT NULL DEFAULT '[]', -- [{cards: [...], winner: index}, ...]
    bidding_history JSONB NOT NULL DEFAULT '[]',
    talon_distribution JSONB NOT NULL DEFAULT '[0,0,0,0]',
    lead_suit VARCHAR(20),
    trick_start_player INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    player_index INTEGER,
    suit VARCHAR(20) NOT NULL, -- clubs, diamonds, hearts, spades, tarock
    value INTEGER NOT NULL,
    is_honor BOOLEAN DEFAULT FALSE,
    location VARCHAR(20) NOT NULL, -- hand, talon, trick, discarded
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_cards_game_id ON cards(game_id);
CREATE INDEX idx_cards_location ON cards(location);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_state_updated_at BEFORE UPDATE ON game_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
