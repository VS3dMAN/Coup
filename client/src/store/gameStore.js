import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
    // Connection state
    socket: null,
    connected: false,

    // Player state
    playerId: null,
    playerName: null,

    // Room state
    roomCode: null,
    gameId: null,

    // Game state
    gameState: null,
    players: [],
    currentPlayerId: null,
    actionInProgress: null,
    actionHistory: [],
    winner: null,
    hostId: null,

    // Chat state
    chatMessages: [],

    // UI state
    error: null,
    loading: false,

    // Actions
    setSocket: (socket) => set({ socket, connected: true }),

    setPlayerInfo: (playerId, playerName) => set({ playerId, playerName }),

    setRoomInfo: (roomCode, gameId) => set({ roomCode, gameId }),

    updateGameState: (gameState) => {
        try {
            if (!gameState || typeof gameState !== 'object') {
                throw new Error('Received invalid game state from server');
            }
            set({
                gameState: gameState.gameState,
                players: gameState.players ?? [],
                currentPlayerId: gameState.currentPlayerId,
                actionInProgress: gameState.actionInProgress,
                actionHistory: gameState.actionHistory ?? [],
                winner: gameState.winner,
                hostId: gameState.hostId
            });
        } catch (err) {
            console.error('Failed to apply game state update:', err);
            set({ error: err.message });
        }
    },

    addChatMessage: (message) => set(state => ({
        chatMessages: [...state.chatMessages.slice(-99), message]
    })),

    clearChat: () => set({ chatMessages: [] }),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null }),

    setLoading: (loading) => set({ loading }),

    reset: () => {
        localStorage.removeItem('coup_session');
        set({
            socket: null,
            connected: false,
            playerId: null,
            playerName: null,
            roomCode: null,
            gameId: null,
            gameState: null,
            players: [],
            currentPlayerId: null,
            actionInProgress: null,
            actionHistory: [],
            winner: null,
            hostId: null,
            chatMessages: [],
            error: null,
            loading: false
        });
    },

    saveSession: () => {
        const { gameId, playerId, roomCode, playerName } = get();
        if (gameId && playerId) {
            localStorage.setItem('coup_session', JSON.stringify({ gameId, playerId, roomCode, playerName }));
        }
    },

    clearSession: () => localStorage.removeItem('coup_session'),

    // Computed values
    getCurrentPlayer: () => {
        const state = get();
        return state.players.find(p => p.id === state.currentPlayerId);
    },

    getMyPlayer: () => {
        const state = get();
        return state.players.find(p => p.id === state.playerId);
    },

    isMyTurn: () => {
        const state = get();
        return state.currentPlayerId === state.playerId;
    },

    isHost: () => {
        const state = get();
        return state.hostId === state.playerId;
    },

    canTakeAction: (action) => {
        const state = get();
        const myPlayer = state.players.find(p => p.id === state.playerId);

        if (!myPlayer || !myPlayer.isAlive) return false;
        if (!state.isMyTurn()) return false;
        if (state.gameState !== 'ACTIVE_TURN') return false;

        // Check coin requirements
        if (action === 'COUP' && myPlayer.coins < 7) return false;
        if (action === 'ASSASSINATE' && myPlayer.coins < 3) return false;

        // Check 10+ coin rule
        if (myPlayer.coins >= 10 && action !== 'COUP') return false;

        return true;
    }
}));
