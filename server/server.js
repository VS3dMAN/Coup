import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { GameManager } from './managers/GameManager.js';
import { ActionHandler } from './utils/actions.js';
import { GAME_STATES, DECISION_TIMEOUT_MS } from './utils/constants.js';

const app = express();
const httpServer = createServer(app);
// Allowed origins for CORS
const allowedOrigins = [
    'http://localhost:3000'
];
if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(',').forEach(url => allowedOrigins.push(url.trim()));
}

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());

// Initialize game manager
const gameManager = new GameManager();

// Helper: broadcast game state to all players in a game
function broadcastGameState(game) {
    game.players.forEach(p => {
        io.to(p.socketId).emit('gameStateUpdate',
            game.getGameStateForPlayer(p.id));
    });
    if (game.gameState === GAME_STATES.GAME_OVER) {
        io.to(game.roomCode).emit('gameOver', {
            winner: game.winner,
            players: game.players.map(p => p.getSafeData())
        });
    }
}

// Helper: auto-reveal first unrevealed card for a player
function autoRevealCard(game, gameId) {
    const action = game.actionInProgress;
    if (!action) return;

    const revealFromId = action.awaitingRevealFrom ||
        action.challengeResult?.awaitingRevealFrom ||
        action.blockChallengeResult?.awaitingRevealFrom;
    if (!revealFromId) return;

    const player = game.players.find(p => p.id === revealFromId);
    if (!player) return;

    const autoCardIndex = player.cards.findIndex(c => !c.revealed);
    if (autoCardIndex === -1) return;

    const handler = new ActionHandler(game);
    let result;
    if (action.challengeResult) {
        if (action.challengeResult.actionFails) {
            result = handler.handleFailedClaimReveal(revealFromId, autoCardIndex);
        } else {
            result = handler.handleChallengeReveal(revealFromId, autoCardIndex);
        }
    } else if (action.blockChallengeResult) {
        result = handler.handleBlockChallengeReveal(revealFromId, autoCardIndex);
    } else {
        result = handler.revealCard(revealFromId, autoCardIndex);
    }

    handlePostResult(game, gameId, result);
    broadcastGameState(game);
}

// Decision-phase states where timeout = auto-pass any straggler
const DECISION_STATES = [
    GAME_STATES.WAITING_CHALLENGE,
    GAME_STATES.WAITING_BLOCK,
    GAME_STATES.WAITING_BLOCK_CHALLENGE
];

// Helper: set a game timer with state guard and automatic phase chaining
function setGameTimer(game, gameId, expectedState, handlerFn, timeout = DECISION_TIMEOUT_MS) {
    if (game.pendingTimer) {
        clearTimeout(game.pendingTimer);
        game.pendingTimer = null;
    }

    // For decision phases, expose a deadline so the client can render a live countdown.
    if (DECISION_STATES.includes(expectedState) && game.actionInProgress) {
        game.actionInProgress.decisionDeadline = Date.now() + timeout;
    }

    game.pendingTimer = setTimeout(() => {
        game.pendingTimer = null;
        const currentGame = gameManager.getGame(gameId);
        if (!currentGame || currentGame.gameState !== expectedState) return;

        const handler = new ActionHandler(currentGame);
        let result;

        if (DECISION_STATES.includes(expectedState)) {
            // Treat timeout as "auto-pass everyone who hasn't decided yet."
            // The last auto-pass triggers the same resolution branch as a manual pass,
            // so we never resolve a phase before all eligible players are accounted for.
            const eligible = handler.getEligiblePassPlayers();
            const action = currentGame.actionInProgress;
            const passed = (action && action.passedPlayers) || [];
            const stragglers = eligible.filter(pid => !passed.includes(pid));

            for (const pid of stragglers) {
                const r = handler.handlePass(pid);
                if (r && r.success && !r.waiting) {
                    result = r;
                    break;
                }
            }
            // If no stragglers existed (everyone had passed but timer fired before
            // resolution chained), fall back to the original handler.
            if (!result) {
                result = handlerFn(handler, currentGame);
            }
        } else {
            result = handlerFn(handler, currentGame);
        }

        // Chain timers for subsequent phases
        handlePostResult(currentGame, gameId, result);

        broadcastGameState(currentGame);
    }, timeout);
}

// Helper: after an action resolves, set up timers for the next phase if needed
function handlePostResult(game, gameId, result) {
    if (!result) return;

    if (result.awaitingBlock) {
        setGameTimer(game, gameId, GAME_STATES.WAITING_BLOCK,
            (h) => h.handleNoBlock(), result.timeout || DECISION_TIMEOUT_MS);
    } else if (result.awaitingBlockChallenge) {
        setGameTimer(game, gameId, GAME_STATES.WAITING_BLOCK_CHALLENGE,
            (h) => h.handleNoBlockChallenge(), result.timeout || DECISION_TIMEOUT_MS);
    } else if (result.requiresReveal) {
        // Use direct timeout for reveal to avoid double-broadcast
        if (game.pendingTimer) {
            clearTimeout(game.pendingTimer);
            game.pendingTimer = null;
        }
        game.pendingTimer = setTimeout(() => {
            game.pendingTimer = null;
            const cg = gameManager.getGame(gameId);
            if (!cg || cg.gameState !== GAME_STATES.CHOOSING_INFLUENCE) return;
            autoRevealCard(cg, gameId);
        }, 30000);
    } else if (result.requiresCardSelection) {
        // Auto-select first N cards for exchange after 30s
        game.pendingTimer = setTimeout(() => {
            game.pendingTimer = null;
            const cg = gameManager.getGame(gameId);
            if (!cg || !cg.actionInProgress?.awaitingCardSelection) return;
            const h = new ActionHandler(cg);
            const autoIndices = Array.from({ length: cg.actionInProgress.mustKeep }, (_, i) => i);
            h.selectExchangeCards(cg.actionInProgress.actingPlayer, autoIndices);
            broadcastGameState(cg);
        }, 30000);
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', games: gameManager.games.size });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // CREATE ROOM
    socket.on('createRoom', (data, callback) => {
        try {
            const { playerName } = data;
            const playerId = uuidv4();

            const game = gameManager.createGame();
            const player = gameManager.addPlayerToGame(
                game.gameId,
                playerId,
                playerName,
                socket.id
            );

            socket.join(game.roomCode);

            callback({
                success: true,
                roomCode: game.roomCode,
                gameId: game.gameId,
                playerId: playerId,
                playerData: player.getSafeData(true)
            });

            io.to(game.roomCode).emit('gameStateUpdate',
                game.getGameStateForPlayer(playerId)
            );

            console.log(`Room created: ${game.roomCode} by ${playerName}`);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // REJOIN ROOM (reconnection with stored session token)
    socket.on('rejoinRoom', (data, callback) => {
        try {
            const { gameId, playerId } = data;
            const game = gameManager.getGame(gameId);
            if (!game) return callback({ success: false, error: 'Game not found' });

            const player = game.players.find(p => p.id === playerId);
            if (!player) return callback({ success: false, error: 'Player not found in game' });

            player.socketId = socket.id;
            player.isConnected = true;
            socket.join(game.roomCode);

            callback({ success: true, gameId, playerId, roomCode: game.roomCode });

            game.players.forEach(p => {
                io.to(p.socketId).emit('gameStateUpdate', game.getGameStateForPlayer(p.id));
            });

            console.log(`${player.name} rejoined room: ${game.roomCode}`);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // RECONNECT (dedicated event for mid-game reconnection)
    socket.on('reconnect_attempt', (data, callback) => {
        try {
            const { gameId, playerId } = data;
            const { game, player } = gameManager.reconnectPlayerToGame(gameId, playerId, socket.id);

            socket.join(game.roomCode);

            callback({
                success: true,
                gameId: game.gameId,
                playerId: player.id,
                roomCode: game.roomCode,
                playerName: player.name
            });

            // Notify all players of reconnection
            game.players.forEach(p => {
                io.to(p.socketId).emit('playerReconnected', {
                    playerId: player.id,
                    playerName: player.name
                });
                io.to(p.socketId).emit('gameStateUpdate', game.getGameStateForPlayer(p.id));
            });

            console.log(`${player.name} reconnected to room: ${game.roomCode}`);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // JOIN ROOM
    socket.on('joinRoom', (data, callback) => {
        try {
            const { roomCode, playerName } = data;
            const playerId = uuidv4();

            const game = gameManager.getGameByRoomCode(roomCode);
            if (!game) {
                return callback({ success: false, error: 'Room not found' });
            }

            const player = gameManager.addPlayerToGame(
                game.gameId,
                playerId,
                playerName,
                socket.id
            );

            socket.join(roomCode);

            callback({
                success: true,
                gameId: game.gameId,
                playerId: playerId,
                playerData: player.getSafeData(true)
            });

            // Notify all players
            game.players.forEach(p => {
                io.to(p.socketId).emit('gameStateUpdate',
                    game.getGameStateForPlayer(p.id)
                );
            });

            console.log(`${playerName} joined room: ${roomCode}`);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // START GAME
    socket.on('startGame', (data, callback) => {
        try {
            const { gameId, playerId } = data;
            const game = gameManager.getGame(gameId);

            if (!game) {
                return callback({ success: false, error: 'Game not found' });
            }

            game.lastActivity = Date.now();

            if (game.hostId !== playerId) {
                return callback({ success: false, error: 'Only host can start game' });
            }

            gameManager.startGame(gameId);

            callback({ success: true });

            // Send updated state to all players
            game.players.forEach(p => {
                io.to(p.socketId).emit('gameStateUpdate',
                    game.getGameStateForPlayer(p.id)
                );
            });

            console.log(`Game started: ${game.roomCode}`);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // TAKE ACTION
    socket.on('takeAction', async (data, callback) => {
        try {
            const { gameId, playerId, action, targetPlayerId } = data;
            const game = gameManager.getGame(gameId);

            if (!game) {
                return callback({ success: false, error: 'Game not found' });
            }

            game.lastActivity = Date.now();

            const actionHandler = new ActionHandler(game);

            // Validate action
            const validation = actionHandler.canTakeAction(playerId, action, targetPlayerId);
            if (!validation.valid) {
                return callback({ success: false, error: validation.reason });
            }

            // Execute action based on type
            let result;
            switch (action) {
                case 'INCOME':
                    result = actionHandler.executeIncome(playerId);
                    break;
                case 'FOREIGN_AID':
                    result = actionHandler.executeForeignAid(playerId);
                    break;
                case 'COUP':
                    result = actionHandler.executeCoup(playerId, targetPlayerId);
                    break;
                case 'TAX':
                    result = actionHandler.executeTax(playerId);
                    break;
                case 'ASSASSINATE':
                    result = actionHandler.executeAssassinate(playerId, targetPlayerId);
                    break;
                case 'STEAL':
                    result = actionHandler.executeSteal(playerId, targetPlayerId);
                    break;
                case 'EXCHANGE':
                    result = actionHandler.executeExchange(playerId);
                    break;
                default:
                    return callback({ success: false, error: 'Unknown action' });
            }

            callback({ success: true, result });

            // Broadcast updated state
            game.players.forEach(p => {
                io.to(p.socketId).emit('gameStateUpdate',
                    game.getGameStateForPlayer(p.id)
                );
            });

            // Set up timers for challenge/block/reveal phases
            if (result.awaitingChallenge || result.awaitingBlock) {
                const expectedState = result.awaitingChallenge
                    ? GAME_STATES.WAITING_CHALLENGE
                    : GAME_STATES.WAITING_BLOCK;
                const handler = result.awaitingChallenge
                    ? (h) => h.handleNoChallenge()
                    : (h) => h.handleNoBlock();
                setGameTimer(game, gameId, expectedState, handler, result.timeout || DECISION_TIMEOUT_MS);
            } else {
                // Handle Coup reveal, exchange card selection, etc.
                handlePostResult(game, gameId, result);
            }

        } catch (error) {
            console.error('Action error:', error);
            callback({ success: false, error: error.message });
        }
    });

    // CHALLENGE
    socket.on('challenge', (data, callback) => {
        try {
            const { gameId, playerId } = data;
            const game = gameManager.getGame(gameId);

            if (!game) {
                return callback({ success: false, error: 'Game not found' });
            }

            game.lastActivity = Date.now();

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.handleChallenge(playerId);

            if (result.success && game.pendingTimer) {
                clearTimeout(game.pendingTimer);
                game.pendingTimer = null;
            }

            callback(result);

            broadcastGameState(game);

            // Set up timer for card reveal after challenge
            handlePostResult(game, gameId, result);

        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // BLOCK
    socket.on('block', (data, callback) => {
        try {
            const { gameId, playerId, blockingCharacter } = data;
            const game = gameManager.getGame(gameId);

            if (!game) {
                return callback({ success: false, error: 'Game not found' });
            }

            game.lastActivity = Date.now();

            // Clear the challenge/block-window timer since a block supersedes it
            if (game.pendingTimer) {
                clearTimeout(game.pendingTimer);
                game.pendingTimer = null;
            }

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.handleBlock(playerId, blockingCharacter);

            callback(result);

            broadcastGameState(game);

            // Set timeout for block challenge window
            if (result.awaitingBlockChallenge) {
                setGameTimer(game, gameId, GAME_STATES.WAITING_BLOCK_CHALLENGE,
                    (h) => h.handleNoBlockChallenge(), result.timeout || DECISION_TIMEOUT_MS);
            }

        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // CHALLENGE BLOCK
    socket.on('challengeBlock', (data, callback) => {
        try {
            const { gameId, playerId } = data;
            const game = gameManager.getGame(gameId);

            if (!game) {
                return callback({ success: false, error: 'Game not found' });
            }

            game.lastActivity = Date.now();

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.handleBlockChallenge(playerId);

            if (result.success && game.pendingTimer) {
                clearTimeout(game.pendingTimer);
                game.pendingTimer = null;
            }

            callback(result);

            broadcastGameState(game);

            // Set up timer for card reveal after block challenge
            handlePostResult(game, gameId, result);

        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // REVEAL CARD (when losing influence)
    socket.on('revealCard', (data, callback) => {
        try {
            const { gameId, playerId, cardIndex } = data;
            const game = gameManager.getGame(gameId);

            if (!game) {
                return callback({ success: false, error: 'Game not found' });
            }

            game.lastActivity = Date.now();

            // Clear any pending reveal timeout since player acted manually
            if (game.pendingTimer) {
                clearTimeout(game.pendingTimer);
                game.pendingTimer = null;
            }

            const actionHandler = new ActionHandler(game);
            let result;

            // Determine which type of reveal this is
            if (game.actionInProgress?.challengeResult) {
                if (game.actionInProgress.challengeResult.actionFails) {
                    result = actionHandler.handleFailedClaimReveal(playerId, cardIndex);
                } else {
                    result = actionHandler.handleChallengeReveal(playerId, cardIndex);
                }
            } else if (game.actionInProgress?.blockChallengeResult) {
                result = actionHandler.handleBlockChallengeReveal(playerId, cardIndex);
            } else {
                // Regular reveal (from Coup or Assassination)
                result = actionHandler.revealCard(playerId, cardIndex);
            }

            callback(result);

            broadcastGameState(game);

            // Chain timers for post-reveal phases
            handlePostResult(game, gameId, result);

        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // SELECT CARDS (for Ambassador Exchange)
    socket.on('selectCards', (data, callback) => {
        try {
            const { gameId, playerId, selectedIndices } = data;
            const game = gameManager.getGame(gameId);

            if (!game) {
                return callback({ success: false, error: 'Game not found' });
            }

            game.lastActivity = Date.now();

            // Clear exchange selection timeout since player acted
            if (game.pendingTimer) {
                clearTimeout(game.pendingTimer);
                game.pendingTimer = null;
            }

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.selectExchangeCards(playerId, selectedIndices);

            callback(result);

            broadcastGameState(game);

        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // PASS (decline to challenge/block)
    socket.on('pass', (data, callback) => {
        try {
            const { gameId, playerId } = data;
            const game = gameManager.getGame(gameId);

            if (!game) {
                if (callback && typeof callback === 'function') {
                    return callback({ success: false, error: 'Game not found' });
                }
                return;
            }

            game.lastActivity = Date.now();

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.handlePass(playerId);

            if (callback && typeof callback === 'function') {
                callback({ success: result.success, message: result.message });
            }

            if (result.success) {
                // If all players passed (not just waiting), clear timer and chain next phase
                if (!result.waiting) {
                    if (game.pendingTimer) {
                        clearTimeout(game.pendingTimer);
                        game.pendingTimer = null;
                    }
                    // Chain timers for next phase (block window, reveal, etc.)
                    handlePostResult(game, gameId, result);
                }

                broadcastGameState(game);
            }

        } catch (error) {
            if (callback && typeof callback === 'function') {
                callback({ success: false, error: error.message });
            }
        }
    });

    // SEND CHAT MESSAGE
    socket.on('sendChatMessage', (data) => {
        const { roomCode, playerId, playerName, message } = data;
        if (!roomCode || !message || !message.trim()) return;

        const game = gameManager.getGameByRoomCode(roomCode);
        if (!game) return;

        const chatMessage = {
            playerId,
            playerName,
            message: message.trim().substring(0, 500),
            timestamp: Date.now()
        };

        io.to(roomCode).emit('chatMessage', chatMessage);
    });

    // DISCONNECT
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        // Find games with this socket and mark player as disconnected
        for (const [gameId, game] of gameManager.games.entries()) {
            const player = game.players.find(p => p.socketId === socket.id);
            if (player) {
                player.isConnected = false;

                // Notify other players
                game.players.forEach(p => {
                    if (p.socketId !== socket.id) {
                        io.to(p.socketId).emit('playerDisconnected', {
                            playerId: player.id,
                            playerName: player.name
                        });
                    }
                });

                // In LOBBY, remove the player after a grace period
                if (game.status === 'LOBBY') {
                    const disconnectedPlayerId = player.id;
                    setTimeout(() => {
                        const cg = gameManager.getGame(gameId);
                        if (!cg) return;
                        const p = cg.players.find(pl => pl.id === disconnectedPlayerId);
                        if (!p || p.isConnected) return; // reconnected
                        gameManager.removePlayerFromGame(gameId, disconnectedPlayerId);
                        broadcastGameState(cg);
                    }, 30000);
                    continue;
                }

                // In ACTIVE game, keep the player but auto-resolve after grace period
                if (game.status === 'ACTIVE' && player.isAlive) {
                    const disconnectedPlayerId = player.id;

                    // Broadcast updated state showing disconnection immediately
                    broadcastGameState(game);

                    // 15s grace period before auto-resolving game actions
                    setTimeout(() => {
                        const cg = gameManager.getGame(gameId);
                        if (!cg) return;
                        const p = cg.players.find(pl => pl.id === disconnectedPlayerId);
                        if (!p || p.isConnected) return; // player reconnected

                        // If it's their turn, auto-take Income
                        if (cg.gameState === GAME_STATES.ACTIVE_TURN &&
                            cg.getCurrentPlayer().id === disconnectedPlayerId) {
                            const handler = new ActionHandler(cg);
                            handler.executeIncome(disconnectedPlayerId);
                            broadcastGameState(cg);
                            return;
                        }

                        // If waiting for their pass in challenge/block, auto-pass
                        if ([GAME_STATES.WAITING_CHALLENGE, GAME_STATES.WAITING_BLOCK,
                        GAME_STATES.WAITING_BLOCK_CHALLENGE].includes(cg.gameState)) {
                            const handler = new ActionHandler(cg);
                            const result = handler.handlePass(disconnectedPlayerId);
                            if (result.success) {
                                if (!result.waiting) {
                                    if (cg.pendingTimer) {
                                        clearTimeout(cg.pendingTimer);
                                        cg.pendingTimer = null;
                                    }
                                    handlePostResult(cg, gameId, result);
                                }
                                broadcastGameState(cg);
                            }
                            return;
                        }

                        // If waiting for their card reveal, auto-reveal
                        if (cg.gameState === GAME_STATES.CHOOSING_INFLUENCE) {
                            autoRevealCard(cg, gameId);
                            return;
                        }

                        // If waiting for their exchange card selection, auto-select
                        if (cg.actionInProgress?.awaitingCardSelection &&
                            cg.actionInProgress.actingPlayer === disconnectedPlayerId) {
                            const handler = new ActionHandler(cg);
                            const autoIndices = Array.from(
                                { length: cg.actionInProgress.mustKeep }, (_, i) => i
                            );
                            handler.selectExchangeCards(disconnectedPlayerId, autoIndices);
                            broadcastGameState(cg);
                        }
                    }, 15000);
                }
            }
        }
    });
});

// Redis adapter for horizontal scaling (optional).
// Set REDIS_URL env var to enable. Without it, falls back to single-instance mode.
// IMPORTANT: also configure sticky sessions at your load balancer — game state is
// in-memory, so all sockets from the same room must route to the same server instance.
async function initRedisAdapter() {
    if (!process.env.REDIS_URL) return;
    try {
        const { createAdapter } = await import('@socket.io/redis-adapter');
        const { Redis } = await import('ioredis');
        const pubClient = new Redis(process.env.REDIS_URL);
        const subClient = pubClient.duplicate();
        pubClient.on('error', (err) => console.error('Redis pub error:', err.message));
        subClient.on('error', (err) => console.error('Redis sub error:', err.message));
        io.adapter(createAdapter(pubClient, subClient));
        console.log('Socket.IO Redis adapter enabled');
    } catch (err) {
        console.warn('Redis adapter setup failed, running single-instance:', err.message);
    }
}

await initRedisAdapter();

// Periodic cleanup of inactive/finished games (every 30 minutes)
setInterval(() => gameManager.cleanupOldGames(), 30 * 60 * 1000);

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
