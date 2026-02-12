import { v4 as uuidv4 } from 'uuid';
import { Game } from '../models/Game.js';

export class GameManager {
    constructor() {
        this.games = new Map(); // gameId -> Game
        this.roomCodes = new Map(); // roomCode -> gameId
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

        return game.addPlayer(playerId, playerName, socketId);
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

    // Start a game
    startGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) throw new Error('Game not found');

        game.startGame();
        return game;
    }

    // Clean up old games (optional, for future use)
    cleanupOldGames(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
        const now = Date.now();
        for (const [gameId, game] of this.games.entries()) {
            // Check if createdAt exists, fallback to now if not (though it should exist from Game model)
            const gameAge = now - (game.createdAt || now);
            if (gameAge > maxAge || game.status === 'FINISHED') {
                this.roomCodes.delete(game.roomCode);
                this.games.delete(gameId);
            }
        }
    }
}
