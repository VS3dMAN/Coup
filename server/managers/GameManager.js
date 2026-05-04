import { v4 as uuidv4 } from 'uuid';
import { Game } from '../models/Game.js';
import { supabase } from '../db/supabase.js';
import { clearLastActivity } from '../db/logger.js';

export class GameManager {
    constructor() {
        this.games = new Map(); // gameId -> Game
        this.roomCodes = new Map(); // roomCode -> gameId
        
        // Clean up memory leaks every 10 minutes
        setInterval(() => this.cleanupOldGames(), 10 * 60 * 1000);
    }

    // Generate a unique 4-character room code
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code;
        do {
            code = '';
            for (let i = 0; i < 4; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.roomCodes.has(code));
        return code;
    }

    // Create a new game
    createGame() {
        const roomCode = this.generateRoomCode();
        const game = new Game(roomCode);

        this.games.set(game.gameId, game);
        this.roomCodes.set(roomCode, game.gameId);

        if (supabase) {
            supabase.from('games').insert({
                id: game.gameId,
                server_version: process.env.npm_package_version ?? '1.0.0'
            }).then(({ error }) => { if (error) console.error('[db] games insert:', error.message); });
        }

        return game;
    }

    // Get game by gameId
    getGame(gameId) {
        return this.games.get(gameId);
    }

    // Get game by room code
    getGameByRoomCode(roomCode) {
        const gameId = this.roomCodes.get(roomCode);
        return gameId ? this.games.get(gameId) : null;
    }

    // Add player to a game
    addPlayerToGame(gameId, playerId, playerName, socketId) {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Game not found');
        if (game.status !== 'LOBBY') throw new Error('Game already started');
        if (game.players.length >= 6) throw new Error('Game is full');

        const player = game.addPlayer(playerId, playerName, socketId);

        if (supabase) {
            supabase.from('players').insert({
                game_id: game.gameId,
                player_id: playerId,
                name: playerName,
                seat: game.players.length - 1
            }).then(({ error }) => { if (error) console.error('[db] players insert:', error.message); });
        }

        return player;
    }

    // Remove player from game
    removePlayerFromGame(gameId, playerId) {
        const game = this.games.get(gameId);
        if (!game) return;

        game.removePlayer(playerId);

        // Delete game if empty
        if (game.players.length === 0) {
            this.roomCodes.delete(game.roomCode);
            this.games.delete(gameId);
        }
    }

    // Reconnect a player to an active game (bypass lobby check)
    reconnectPlayerToGame(gameId, playerId, newSocketId) {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Game not found');

        const player = game.players.find(p => p.id === playerId);
        if (!player) throw new Error('Player not found in game');

        player.socketId = newSocketId;
        player.isConnected = true;
        return { game, player };
    }

    // Start a game
    startGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Game not found');

        game.startGame();
        return game;
    }

    // Clean up games that have been inactive or finished
    cleanupOldGames(maxInactivity = 30 * 60 * 1000) { // 30 minutes
        const now = Date.now();
        for (const [gameId, game] of this.games.entries()) {
            const inactive = now - (game.lastActivity || game.createdAt || now);
            if (inactive > maxInactivity || game.status === 'FINISHED') {
                if (game.pendingTimer) {
                    clearTimeout(game.pendingTimer);
                    game.pendingTimer = null;
                }
                this.roomCodes.delete(game.roomCode);
                this.games.delete(gameId);
                clearLastActivity(gameId);

                if (supabase) {
                    supabase.from('games').update({
                        ended_at: new Date().toISOString(),
                        end_reason: game.status === 'FINISHED' ? 'finished' : 'cleanup',
                        player_count: game.players.length
                    }).eq('id', gameId)
                        .then(({ error }) => { if (error) console.error('[db] games update:', error.message); });
                }
            }
        }
    }
}
