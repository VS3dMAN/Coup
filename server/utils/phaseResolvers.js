import { ActionHandler } from './actions.js';
import { GAME_STATES } from './constants.js';

export function resolvePassPhase(game) {
    const handler = new ActionHandler(game);
    switch (game.gameState) {
        case GAME_STATES.WAITING_CHALLENGE:
            return handler.handleNoChallenge();
        case GAME_STATES.WAITING_BLOCK:
            return handler.handleNoBlock();
        case GAME_STATES.WAITING_BLOCK_CHALLENGE:
            return handler.handleNoBlockChallenge();
        default:
            return null;
    }
}
