import { ActionHandler } from './utils/actions.js';
import { GAME_STATES } from './utils/constants.js';
import { resolvePassPhase } from './utils/phaseResolvers.js';
import { logEvent, getLastActivity } from './db/logger.js';

const WAITING_STATES = [
    GAME_STATES.WAITING_CHALLENGE,
    GAME_STATES.WAITING_BLOCK,
    GAME_STATES.WAITING_BLOCK_CHALLENGE,
];

const ZOMBIE_TIMEOUT = 5 * 60 * 1000;    // 5 min no activity → zombie
const STALE_GRACE = 3000;                 // deadline overrun grace before acting
const FORCE_SKIP_WINDOW = 30 * 1000;     // window for counting repeat interventions
const FORCE_SKIP_THRESHOLD = 3;

// Track per-game intervention counts for last-resort force-skip
// key: `${gameId}:${phase}`, value: { count, firstAt }
const interventions = new Map();

function recordIntervention(gameId, phase) {
    const key = `${gameId}:${phase}`;
    const now = Date.now();
    const entry = interventions.get(key);
    if (!entry || now - entry.firstAt > FORCE_SKIP_WINDOW) {
        interventions.set(key, { count: 1, firstAt: now });
        return 1;
    }
    entry.count++;
    return entry.count;
}

function clearIntervention(gameId, phase) {
    interventions.delete(`${gameId}:${phase}`);
}

export function startWatchdog(io, gameManager) {
    setInterval(() => tick(io, gameManager), 2000);
}

function broadcastAndLog(io, game, rule, extra = {}) {
    logEvent({
        gameId: game.gameId,
        kind: 'watchdog_intervention',
        phase: game.gameState,
        payload: { rule, ...extra }
    });
    game.players.forEach(p => {
        io.to(p.socketId).emit('gameStateUpdate', game.getGameStateForPlayer(p.id));
    });
}

function tick(io, gameManager) {
    const now = Date.now();

    for (const [gameId, game] of gameManager.games.entries()) {
        if (game.status !== 'ACTIVE' || game.gameState === GAME_STATES.GAME_OVER) continue;

        // Rule 5 — zombie: no socket activity for >5 min
        const lastActivity = getLastActivity(gameId);
        if (lastActivity !== null && now - lastActivity > ZOMBIE_TIMEOUT) {
            game.status = 'FINISHED';
            broadcastAndLog(io, game, 'zombie');
            continue;
        }

        if (!WAITING_STATES.includes(game.gameState)) continue;

        const action = game.actionInProgress;
        if (!action) continue;

        const phase = game.gameState;
        const handler = new ActionHandler(game);

        // Rule 3 — all eligible already passed but phase didn't resolve
        const eligible = handler.getEligiblePassPlayers();
        const passed = action.passedPlayers ?? [];
        if (eligible.length > 0 && eligible.every(pid => passed.includes(pid))) {
            const count = recordIntervention(gameId, phase);
            if (count >= FORCE_SKIP_THRESHOLD) {
                forceSkip(io, gameManager, game, gameId);
            } else {
                const result = resolvePassPhase(game);
                broadcastAndLog(io, game, 'all_passed', { result: result?.success });
                if (result) chainPostResult(io, gameManager, game, gameId, result);
            }
            continue;
        }

        // Rule 4 — waiting on impossible player (eliminated or disconnected)
        // Note: server.js already handles the 15s grace on disconnect; if a player
        // is still disconnected by the time we get here, they've been disconnected
        // long enough that the grace has either fired or they won't reconnect.
        const impossiblePlayers = eligible.filter(pid => {
            const p = game.players.find(pl => pl.id === pid);
            if (!p) return true;
            if (!p.isAlive) return true;
            if (!p.isConnected) return true;
            return false;
        });

        if (impossiblePlayers.length > 0) {
            const count = recordIntervention(gameId, phase);
            if (count >= FORCE_SKIP_THRESHOLD) {
                forceSkip(io, gameManager, game, gameId);
            } else {
                for (const pid of impossiblePlayers) {
                    if (!passed.includes(pid)) {
                        handler.handlePass(pid);
                    }
                }
                broadcastAndLog(io, game, 'impossible_player', { players: impossiblePlayers });
                // Check if that resolved it
                const updatedPassed = action.passedPlayers ?? [];
                if (eligible.every(pid => updatedPassed.includes(pid))) {
                    const result = resolvePassPhase(game);
                    if (result) chainPostResult(io, gameManager, game, gameId, result);
                }
                broadcastAndLog(io, game, 'impossible_player_resolved');
            }
            continue;
        }

        // Rule 1 — stale deadline: decisionDeadline expired but timer didn't fire
        const deadline = action.decisionDeadline;
        if (deadline && now > deadline + STALE_GRACE && !game.pendingTimer) {
            const count = recordIntervention(gameId, phase);
            if (count >= FORCE_SKIP_THRESHOLD) {
                forceSkip(io, gameManager, game, gameId);
            } else {
                // Auto-pass any stragglers
                const stragglers = eligible.filter(pid => !passed.includes(pid));
                let result;
                for (const pid of stragglers) {
                    const r = handler.handlePass(pid);
                    if (r?.success && !r.waiting) { result = r; break; }
                }
                if (!result) result = resolvePassPhase(game);
                broadcastAndLog(io, game, 'stale_deadline');
                if (result) chainPostResult(io, gameManager, game, gameId, result);
            }
            continue;
        }

        // Rule 2 — waiting phase but no timer armed and deadline not yet set
        if (!game.pendingTimer && !deadline) {
            const count = recordIntervention(gameId, phase);
            if (count >= FORCE_SKIP_THRESHOLD) {
                forceSkip(io, gameManager, game, gameId);
            } else {
                broadcastAndLog(io, game, 'missing_timer');
                // Re-arm by broadcasting — server.js timers are managed there,
                // so we just signal clients to re-render; the next tick will catch
                // stale_deadline if things still don't move.
                game.players.forEach(p => {
                    io.to(p.socketId).emit('gameStateUpdate', game.getGameStateForPlayer(p.id));
                });
            }
        }
    }
}

function forceSkip(io, gameManager, game, gameId) {
    const currentPhase = game.gameState;

    // Discard stuck action
    game.actionInProgress = null;
    game.gameState = GAME_STATES.ACTIVE_TURN;

    // Advance to next alive player
    const alivePlayers = game.players.filter(p => p.isAlive);
    if (alivePlayers.length === 0) return;
    const currentIdx = alivePlayers.findIndex(p => p.id === game.currentPlayerId);
    const nextIdx = (currentIdx + 1) % alivePlayers.length;
    game.currentPlayerId = alivePlayers[nextIdx].id;

    clearIntervention(gameId, currentPhase);

    logEvent({ gameId, kind: 'watchdog_intervention', phase: currentPhase, payload: { rule: 'force_skip', nextPlayer: game.currentPlayerId } });

    game.players.forEach(p => {
        io.to(p.socketId).emit('systemMessage', { message: 'Game recovered from a stuck state — skipping to next turn.' });
        io.to(p.socketId).emit('gameStateUpdate', game.getGameStateForPlayer(p.id));
    });
}

// Minimal post-result chaining needed by the watchdog (mirrors server.js handlePostResult logic)
function chainPostResult(io, gameManager, game, gameId, result) {
    if (!result) return;
    // If another waiting phase opened, just broadcast — the existing timer in server.js
    // would have been set during the resolve call. Watchdog will catch it next tick if not.
    game.players.forEach(p => {
        io.to(p.socketId).emit('gameStateUpdate', game.getGameStateForPlayer(p.id));
    });
}
