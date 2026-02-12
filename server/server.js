import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { GameManager } from './managers/GameManager.js';
import { ActionHandler } from './utils/actions.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173'],
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// Initialize game manager
const gameManager = new GameManager();

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

            // Set timeout for challenge/block windows if needed
            if (result.awaitingChallenge || result.awaitingBlock) {
                setTimeout(() => {
                    const currentGame = gameManager.getGame(gameId);
                    if (!currentGame) return;

                    const handler = new ActionHandler(currentGame);
                    let timeoutResult;

                    if (result.awaitingChallenge) {
                        timeoutResult = handler.handleNoChallenge();
                    } else if (result.awaitingBlock) {
                        timeoutResult = handler.handleNoBlock();
                    }

                    currentGame.players.forEach(p => {
                        io.to(p.socketId).emit('gameStateUpdate',
                            currentGame.getGameStateForPlayer(p.id)
                        );
                    });
                }, result.timeout || 10000);
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

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.handleChallenge(playerId);

            callback(result);

            // Broadcast updated state
            game.players.forEach(p => {
                io.to(p.socketId).emit('gameStateUpdate',
                    game.getGameStateForPlayer(p.id)
                );
            });

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

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.handleBlock(playerId, blockingCharacter);

            callback(result);

            // Broadcast updated state
            game.players.forEach(p => {
                io.to(p.socketId).emit('gameStateUpdate',
                    game.getGameStateForPlayer(p.id)
                );
            });

            // Set timeout for block challenge window
            if (result.awaitingBlockChallenge) {
                setTimeout(() => {
                    const currentGame = gameManager.getGame(gameId);
                    if (!currentGame) return;

                    const handler = new ActionHandler(currentGame);
                    const timeoutResult = handler.handleNoBlockChallenge();

                    currentGame.players.forEach(p => {
                        io.to(p.socketId).emit('gameStateUpdate',
                            currentGame.getGameStateForPlayer(p.id)
                        );
                    });
                }, result.timeout || 10000);
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

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.handleBlockChallenge(playerId);

            callback(result);

            // Broadcast updated state
            game.players.forEach(p => {
                io.to(p.socketId).emit('gameStateUpdate',
                    game.getGameStateForPlayer(p.id)
                );
            });

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

            // Broadcast updated state
            game.players.forEach(p => {
                io.to(p.socketId).emit('gameStateUpdate',
                    game.getGameStateForPlayer(p.id)
                );
            });

            // If game is over, notify everyone
            if (result.gameOver) {
                io.to(game.roomCode).emit('gameOver', {
                    winner: game.winner,
                    players: game.players.map(p => p.getSafeData())
                });
            }

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

            const actionHandler = new ActionHandler(game);
            const result = actionHandler.selectExchangeCards(playerId, selectedIndices);

            callback(result);

            // Broadcast updated state
            game.players.forEach(p => {
                io.to(p.socketId).emit('gameStateUpdate',
                    game.getGameStateForPlayer(p.id)
                );
            });

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

            // This is mainly for UI feedback - actual timeout handles progression
            if (callback && typeof callback === 'function') {
                callback({ success: true, message: 'Passed' });
            }

        } catch (error) {
            if (callback && typeof callback === 'function') {
                callback({ success: false, error: error.message });
            }
        }
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
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
