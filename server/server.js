import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { GameManager } from './managers/GameManager.js';
import { ActionHandler } from './utils/actions.js';
import { GAME_STATES, DECISION_TIMEOUT_MS } from './utils/constants.js';
import { logEvent, flushSync } from './db/logger.js';
import { startWatchdog } from './watchdog.js';

const app = express();
const httpServer = createServer(app);
const allowedOrigins = ['http://localhost:3000'];
if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(',').forEach(url => allowedOrigins.push(url.trim()));
}

const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true }
});

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

const gameManager = new GameManager();

function broadcastGameState(game) {
    const payloadSize = JSON.stringify(game.getGameStateForPlayer(game.players[0]?.id ?? '')).length;
    logEvent({ gameId: game.gameId, kind: 'broadcast', phase: game.gameState, payload: { players: game.players.length, bytes: payloadSize } });
    game.players.forEach(p => {
        io.to(p.socketId).emit('gameStateUpdate', game.getGameStateForPlayer(p.id));
    });
    if (game.gameState === GAME_STATES.GAME_OVER) {
        io.to(game.roomCode).emit('gameOver', {
            winner: game.winner,
            players: game.players.map(p => p.getSafeData())
        });
    }
}

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

const DECISION_STATES = [
    GAME_STATES.WAITING_CHALLENGE,
    GAME_STATES.WAITING_BLOCK,
    GAME_STATES.WAITING_BLOCK_CHALLENGE
];

function setGameTimer(game, gameId, expectedState, handlerFn, timeout = DECISION_TIMEOUT_MS) {
    if (game.pendingTimer) {
        clearTimeout(game.pendingTimer);
        game.pendingTimer = null;
    }

    if (DECISION_STATES.includes(expectedState) && game.actionInProgress) {
        game.actionInProgress.decisionDeadline = Date.now() + timeout;
    }

    logEvent({ gameId, kind: 'timer_set', phase: expectedState, payload: { timeout } });
    game.pendingTimer = setTimeout(() => {
        game.pendingTimer = null;
        const currentGame = gameManager.getGame(gameId);
        if (!currentGame || currentGame.gameState !== expectedState) return;

        logEvent({ gameId, kind: 'timer_fire', phase: expectedState });
        const handler = new ActionHandler(currentGame);
        let result;

        if (DECISION_STATES.includes(expectedState)) {
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
            if (!result) {
                result = handlerFn(handler, currentGame);
            }
        } else {
            result = handlerFn(handler, currentGame);
        }

        handlePostResult(currentGame, gameId, result);
        broadcastGameState(currentGame);
    }, timeout);
}

function handlePostResult(game, gameId, result) {
    if (!result) return;

    if (result.awaitingBlock) {
        setGameTimer(game, gameId, GAME_STATES.WAITING_BLOCK,
            (h) => h.handleNoBlock(), result.timeout || DECISION_TIMEOUT_MS);
    } else if (result.awaitingBlockChallenge) {
        setGameTimer(game, gameId, GAME_STATES.WAITING_BLOCK_CHALLENGE,
            (h) => h.handleNoBlockChallenge(), result.timeout || DECISION_TIMEOUT_MS);
    } else if (result.requiresReveal) {
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

process.on('SIGTERM', async () => {
    await flushSync();
    process.exit(0);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', games: gameManager.games.size });
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('createRoom', (data, callback) => {
        try {
            const { playerName } = data;
            const playerId = uuidv4();

            const game = gameManager.createGame();
            logEvent({ gameId: game.gameId, kind: 'socket_in', payload: { event: 'createRoom' } });
            const player = gameManager.addPlayerToGame(game.gameId, playerId, playerName, socket.id);

            socket.join(game.roomCode);
            callback({ success: true, roomCode: game.roomCode, gameId: game.gameId, playerId, playerData: player.getSafeData(true) });
            io.to(game.roomCode).emit('gameStateUpdate', game.getGameStateForPlayer(playerId));
            console.log(`Room created: ${game.roomCode} by ${playerName}`);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('rejoinRoom', (data, callback) => {
        try {
            const { gameId, playerId } = data;
            logEvent({ gameId, kind: 'socket_in', actor: playerId, payload: { event: 'rejoinRoom' } });
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

    socket.on('reconnect_attempt', (data, callback) => {
        try {
            const { gameId, playerId } = data;
            logEvent({ gameId, kind: 'socket_in', actor: playerId, payload: { event: 'reconnect_attempt' } });
            const { game, player } = gameManager.reconnectPlayerToGame(gameId, playerId, socket.id);

            socket.join(game.roomCode);
            callback({ success: true, gameId: game.gameId, playerId: player.id, roomCode: game.roomCode, playerName: player.name });
            game.players.forEach(p => {
                io.to(p.socketId).emit('playerReconnected', { playerId: player.id, playerName: player.name });
                io.to(p.socketId).emit('gameStateUpdate', game.getGameStateForPlayer(p.id));
            });
            console.log(`${player.name} reconnected to room: ${game.roomCode}`);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('joinRoom', (data, callback) => {
        try {
            const { roomCode, playerName } = data;
            const playerId = uuidv4();

            const game = gameManager.getGameByRoomCode(roomCode);
            if (!game) return callback({ success: false, error: 'Room not found' });

            logEvent({ gameId: game.gameId, kind: 'socket_in', payload: { event: 'joinRoom', playerName } });
            const player = gameManager.addPlayerToGame(game.gameId, playerId, playerName, socket.id);

            socket.join(roomCode);
            callback({ success: true, gameId: game.gameId, playerId, playerData: player.getSafeData(true) });
            game.players.forEach(p => {
                io.to(p.socketId).emit('gameStateUpdate', game.getGameStateForPlayer(p.id));
            });
            console.log(`${playerName} joined room: ${roomCode}`);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('startGame', (data, callback) => {
        try {
            const { gameId, playerId } = data;
            const game = gameManager.getGame(gameId);
            if (!game) return callback({ success: false, error: 'Game not found' });

            logEvent({ gameId, kind: 'socket_in', actor: playerId, payload: { event: 'startGame' } });
            game.lastActivity = Date.now();

            if (game.hostId !== playerId) return callback({ success: false, error: 'Only host can start game' });

            gameManager.startGame(gameId);
            callback({ success: true });
            game.players.forEach(p => {
                io.to(p.socketId).emit('gameStateUpdate', game.getGameStateForPlayer(p.id));
            });
            console.log(`Game started: ${game.roomCode}`);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('takeAction', async (data, callback) => {
        try {
            const { gameId, playerId, action, targetPlayerId } = data;
            const game = gameManager.getGame(gameId);
            if (!game) return callback({ success: false, error: 'Game not found' });

            logEvent({ gameId, kind: 'socket_in', actor: playerId, phase: game.gameState, payload: { event: 'takeAction', action, targetPlayerId } });
            game.lastActivity = Date.now();

            const actionHandler = new ActionHandler(game);
            const validation = actionHandler.canTakeAction(playerId, action, targetPlayerId);
            if (!validation.valid) return callback({ success: false, error: validation.reason });

            let result;
            switch (action) {
                case 'INCOME':    result = actionHandler.executeIncome(playerId); break;
                case 'FOREIGN_AID': result = actionHandler.executeForeignAid(playerId); break;
                case 'COUP':     result = actionHandler.executeCoup(playerId, targetPlayerId); break;
                case 'TAX':      result = actionHandler.executeTax(playerId); break;
                case 'ASSASSINATE': result = actionHandler.executeAssassinate(playerId, targetPlayerId); break;
                case 'STEAL':    result = actionHandler.executeSteal(playerId, targetPlayerId); break;
                case 'EXCHANGE': result = actionHandler.executeExchange(playerId); break;
                default: return callback({ success: false, error: 'Unknown action' });
            }

            callback({ success: true, result });
            game.players.forEach(p => {
                io.to(p.socketId).emit('gameStateUpdate', game.getGameStateForPlayer(p.id));
            });

            if (result.awaitingChallenge || result.awaitingBlock) {
                const expectedState = result.awaitingChallenge ? GAME_STATES.WAITING_CHALLENGE : GAME_STATES.WAITING_BLOCK;
                const handler = result.awaitingChallenge ? (h) => h.handleNoChallenge() : (h) => h.handleNoBlock();
                setGameTimer(game, gameId, expectedState, handler, result.timeout || DECISION_TIMEOUT_MS);
            } else {
                handlePostResult(game, gameId, result);
            }
        } catch (error) {
            console.error('Action error:', error);
            logEvent({ gameId: data?.gameId, kind: 'error', payload: { event: 'takeAction', message: error.message } });
            callback({ success: false, error: error.message });
        }
    });

    socket.on('challenge', (data, callback) => {
        try {
            const { gameId, playerId } = data;
            const game = gameManager.getGame(gameId);
            if (!game) return callback({ success: false, error: 'Game not found' });

            logEvent({ gameId, kind: 'socket_in', actor: playerId, phase: game.gameState, payload: { event: 'challenge' } });
            game.lastActivity = Date.now();

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.handleChallenge(playerId);

            if (result.success && game.pendingTimer) {
                clearTimeout(game.pendingTimer);
                game.pendingTimer = null;
            }

            callback(result);
            broadcastGameState(game);
            handlePostResult(game, gameId, result);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('block', (data, callback) => {
        try {
            const { gameId, playerId, blockingCharacter } = data;
            const game = gameManager.getGame(gameId);
            if (!game) return callback({ success: false, error: 'Game not found' });

            logEvent({ gameId, kind: 'socket_in', actor: playerId, phase: game.gameState, payload: { event: 'block', blockingCharacter } });
            game.lastActivity = Date.now();

            if (game.pendingTimer) {
                clearTimeout(game.pendingTimer);
                game.pendingTimer = null;
            }

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.handleBlock(playerId, blockingCharacter);

            callback(result);
            broadcastGameState(game);

            if (result.awaitingBlockChallenge) {
                setGameTimer(game, gameId, GAME_STATES.WAITING_BLOCK_CHALLENGE,
                    (h) => h.handleNoBlockChallenge(), result.timeout || DECISION_TIMEOUT_MS);
            }
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('challengeBlock', (data, callback) => {
        try {
            const { gameId, playerId } = data;
            const game = gameManager.getGame(gameId);
            if (!game) return callback({ success: false, error: 'Game not found' });

            logEvent({ gameId, kind: 'socket_in', actor: playerId, phase: game.gameState, payload: { event: 'challengeBlock' } });
            game.lastActivity = Date.now();

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.handleBlockChallenge(playerId);

            if (result.success && game.pendingTimer) {
                clearTimeout(game.pendingTimer);
                game.pendingTimer = null;
            }

            callback(result);
            broadcastGameState(game);
            handlePostResult(game, gameId, result);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('revealCard', (data, callback) => {
        try {
            const { gameId, playerId, cardIndex } = data;
            const game = gameManager.getGame(gameId);
            if (!game) return callback({ success: false, error: 'Game not found' });

            logEvent({ gameId, kind: 'socket_in', actor: playerId, phase: game.gameState, payload: { event: 'revealCard', cardIndex } });
            game.lastActivity = Date.now();

            if (game.pendingTimer) {
                clearTimeout(game.pendingTimer);
                game.pendingTimer = null;
            }

            const actionHandler = new ActionHandler(game);
            let result;

            if (game.actionInProgress?.challengeResult) {
                if (game.actionInProgress.challengeResult.actionFails) {
                    result = actionHandler.handleFailedClaimReveal(playerId, cardIndex);
                } else {
                    result = actionHandler.handleChallengeReveal(playerId, cardIndex);
                }
            } else if (game.actionInProgress?.blockChallengeResult) {
                result = actionHandler.handleBlockChallengeReveal(playerId, cardIndex);
            } else {
                result = actionHandler.revealCard(playerId, cardIndex);
            }

            callback(result);
            broadcastGameState(game);
            handlePostResult(game, gameId, result);
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('selectCards', (data, callback) => {
        try {
            const { gameId, playerId, selectedIndices } = data;
            const game = gameManager.getGame(gameId);
            if (!game) return callback({ success: false, error: 'Game not found' });

            logEvent({ gameId, kind: 'socket_in', actor: playerId, phase: game.gameState, payload: { event: 'selectCards' } });
            game.lastActivity = Date.now();

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

    socket.on('pass', (data, callback) => {
        try {
            const { gameId, playerId } = data;
            const game = gameManager.getGame(gameId);

            if (!game) {
                if (typeof callback === 'function') callback({ success: false, error: 'Game not found' });
                return;
            }

            logEvent({ gameId, kind: 'socket_in', actor: playerId, phase: game.gameState, payload: { event: 'pass' } });
            game.lastActivity = Date.now();

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.handlePass(playerId);

            if (typeof callback === 'function') callback({ success: result.success, message: result.message });

            if (result.success) {
                if (!result.waiting) {
                    if (game.pendingTimer) {
                        clearTimeout(game.pendingTimer);
                        game.pendingTimer = null;
                    }
                    handlePostResult(game, gameId, result);
                }
                broadcastGameState(game);
            }
        } catch (error) {
            if (typeof callback === 'function') callback({ success: false, error: error.message });
        }
    });

    socket.on('sendChatMessage', (data) => {
        const { roomCode, playerId, playerName, message } = data;
        if (!roomCode || !message || !message.trim()) return;

        const game = gameManager.getGameByRoomCode(roomCode);
        if (!game) return;

        const chatMessage = { playerId, playerName, message: message.trim().substring(0, 500), timestamp: Date.now() };
        io.to(roomCode).emit('chatMessage', chatMessage);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        for (const [gameId, game] of gameManager.games.entries()) {
            const player = game.players.find(p => p.socketId === socket.id);
            if (player) {
                player.isConnected = false;
                logEvent({ gameId, kind: 'disconnect', actor: player.id, phase: game.gameState });

                game.players.forEach(p => {
                    if (p.socketId !== socket.id) {
                        io.to(p.socketId).emit('playerDisconnected', { playerId: player.id, playerName: player.name });
                    }
                });

                if (game.status === 'LOBBY') {
                    const disconnectedPlayerId = player.id;
                    setTimeout(() => {
                        const cg = gameManager.getGame(gameId);
                        if (!cg) return;
                        const p = cg.players.find(pl => pl.id === disconnectedPlayerId);
                        if (!p || p.isConnected) return;
                        gameManager.removePlayerFromGame(gameId, disconnectedPlayerId);
                        broadcastGameState(cg);
                    }, 30000);
                    continue;
                }

                if (game.status === 'ACTIVE' && player.isAlive) {
                    const disconnectedPlayerId = player.id;
                    broadcastGameState(game);

                    setTimeout(() => {
                        const cg = gameManager.getGame(gameId);
                        if (!cg) return;
                        const p = cg.players.find(pl => pl.id === disconnectedPlayerId);
                        if (!p || p.isConnected) return;

                        if (cg.gameState === GAME_STATES.ACTIVE_TURN && cg.getCurrentPlayer().id === disconnectedPlayerId) {
                            const handler = new ActionHandler(cg);
                            handler.executeIncome(disconnectedPlayerId);
                            broadcastGameState(cg);
                            return;
                        }

                        if ([GAME_STATES.WAITING_CHALLENGE, GAME_STATES.WAITING_BLOCK, GAME_STATES.WAITING_BLOCK_CHALLENGE].includes(cg.gameState)) {
                            const handler = new ActionHandler(cg);
                            const result = handler.handlePass(disconnectedPlayerId);
                            if (result.success) {
                                if (!result.waiting) {
                                    if (cg.pendingTimer) { clearTimeout(cg.pendingTimer); cg.pendingTimer = null; }
                                    handlePostResult(cg, gameId, result);
                                }
                                broadcastGameState(cg);
                            }
                            return;
                        }

                        if (cg.gameState === GAME_STATES.CHOOSING_INFLUENCE) {
                            autoRevealCard(cg, gameId);
                            return;
                        }

                        if (cg.actionInProgress?.awaitingCardSelection && cg.actionInProgress.actingPlayer === disconnectedPlayerId) {
                            const handler = new ActionHandler(cg);
                            const autoIndices = Array.from({ length: cg.actionInProgress.mustKeep }, (_, i) => i);
                            handler.selectExchangeCards(disconnectedPlayerId, autoIndices);
                            broadcastGameState(cg);
                        }
                    }, 15000);
                }
            }
        }
    });
});

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

startWatchdog(io, gameManager);
setInterval(() => gameManager.cleanupOldGames(), 30 * 60 * 1000);

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
