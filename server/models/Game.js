import { v4 as uuidv4 } from 'uuid';
import { CARD_TYPES, GAME_STATES } from '../utils/constants.js';
import { Player } from './Player.js';

export class Game {
    constructor(roomCode) {
        this.gameId = uuidv4();
        this.roomCode = roomCode;
        this.status = 'LOBBY';
        this.players = [];
        this.currentPlayerIndex = 0;
        this.deck = [];
        this.discardPile = [];
        this.gameState = GAME_STATES.LOBBY;
        this.actionInProgress = null;
        this.actionHistory = [];
        this.winner = null;
        this.createdAt = Date.now();
        this.hostId = null;
    }

    // Initialize deck with 3 of each character (15 cards total)
    initializeDeck() {
        this.deck = [];
        Object.values(CARD_TYPES).forEach(cardType => {
            for (let i = 0; i < 3; i++) {
                this.deck.push(cardType);
            }
        });
        this.shuffleDeck();
    }

    // Shuffle the deck
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    // Draw a card from the deck
    drawCard() {
        if (this.deck.length === 0) {
            // Reshuffle discard pile into deck if empty
            this.deck = [...this.discardPile];
            this.discardPile = [];
            this.shuffleDeck();
        }
        return this.deck.pop();
    }

    // Add a player to the game
    addPlayer(playerId, playerName, socketId) {
        const player = new Player(playerId, playerName, socketId);
        this.players.push(player);

        // First player is the host
        if (this.players.length === 1) {
            this.hostId = playerId;
        }

        return player;
    }

    // Remove a player
    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);

        // Assign new host if host left
        if (this.hostId === playerId && this.players.length > 0) {
            this.hostId = this.players[0].id;
        }
    }

    // Start the game (deal cards)
    startGame() {
        if (this.players.length < 2 || this.players.length > 6) {
            throw new Error('Game requires 2-6 players');
        }

        this.initializeDeck();

        // Deal 2 cards to each player
        this.players.forEach(player => {
            player.addCard(this.drawCard());
            player.addCard(this.drawCard());
            player.coins = 2;
            player.influence = 2;
            player.isAlive = true;
        });

        this.status = 'ACTIVE';
        this.gameState = GAME_STATES.ACTIVE_TURN;
        this.currentPlayerIndex = 0;
    }

    // Get current player
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    // Move to next player's turn
    nextTurn() {
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (!this.getCurrentPlayer().isAlive);

        this.gameState = GAME_STATES.ACTIVE_TURN;
        this.actionInProgress = null;
    }

    // Check if game is over
    checkWinCondition() {
        const alivePlayers = this.players.filter(p => p.isAlive);
        if (alivePlayers.length === 1) {
            this.winner = alivePlayers[0].id;
            this.gameState = GAME_STATES.GAME_OVER;
            this.status = 'FINISHED';
            return true;
        }
        return false;
    }

    // Get game state for a specific player (hides other players' cards)
    getGameStateForPlayer(playerId) {
        return {
            gameId: this.gameId,
            roomCode: this.roomCode,
            status: this.status,
            gameState: this.gameState,
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayerId: this.getCurrentPlayer()?.id,
            players: this.players.map(p =>
                p.getSafeData(p.id === playerId)
            ),
            actionInProgress: this.actionInProgress,
            actionHistory: this.actionHistory.slice(-10), // Last 10 actions
            winner: this.winner,
            hostId: this.hostId
        };
    }
}
