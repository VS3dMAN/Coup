/**
 * Utility helper functions for the Coup game server
 */

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
export function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Generate a random room code
 * @param {number} length - Length of the room code
 * @returns {string} - Random alphanumeric room code
 */
export function generateRoomCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Validate player name
 * @param {string} name - Player name to validate
 * @returns {boolean} - Whether the name is valid
 */
export function isValidPlayerName(name) {
    return typeof name === 'string' &&
        name.trim().length >= 2 &&
        name.trim().length <= 20;
}

/**
 * Create a sanitized player object for client
 * @param {Object} player - Full player object
 * @param {boolean} includeCards - Whether to include the player's cards
 * @returns {Object} - Sanitized player data
 */
export function sanitizePlayerData(player, includeCards = false) {
    const sanitized = {
        id: player.id,
        name: player.name,
        coins: player.coins,
        influences: player.influences.map(inf => ({
            revealed: inf.revealed,
            card: inf.revealed ? inf.card : null
        })),
        isAlive: player.isAlive
    };

    if (includeCards) {
        sanitized.influences = player.influences;
    }

    return sanitized;
}
