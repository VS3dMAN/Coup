/**
 * Coup Game Constants - Client Side
 * Matches server-side constants for game rules and card types
 */

export const CARD_TYPES = {
    DUKE: "Duke",
    ASSASSIN: "Assassin",
    CAPTAIN: "Captain",
    AMBASSADOR: "Ambassador",
    CONTESSA: "Contessa"
};

export const ACTIONS = {
    INCOME: "INCOME",
    FOREIGN_AID: "FOREIGN_AID",
    COUP: "COUP",
    TAX: "TAX",
    ASSASSINATE: "ASSASSINATE",
    STEAL: "STEAL",
    EXCHANGE: "EXCHANGE"
};

export const GAME_STATES = {
    LOBBY: "LOBBY",
    ACTIVE_TURN: "ACTIVE_TURN",
    WAITING_CHALLENGE: "WAITING_CHALLENGE",
    RESOLVING_CHALLENGE: "RESOLVING_CHALLENGE",
    WAITING_BLOCK: "WAITING_BLOCK",
    RESOLVING_BLOCK: "RESOLVING_BLOCK",
    WAITING_BLOCK_CHALLENGE: "WAITING_BLOCK_CHALLENGE",
    RESOLVING_ACTION: "RESOLVING_ACTION",
    CHOOSING_INFLUENCE: "CHOOSING_INFLUENCE",
    GAME_OVER: "GAME_OVER"
};

// Card descriptions
export const CARD_INFO = {
    [CARD_TYPES.DUKE]: {
        name: "Duke",
        action: "Tax",
        description: "Take 3 coins from the treasury",
        blocks: "Foreign Aid"
    },
    [CARD_TYPES.ASSASSIN]: {
        name: "Assassin",
        action: "Assassinate",
        description: "Pay 3 coins to force opponent to lose influence",
        blocks: null
    },
    [CARD_TYPES.CAPTAIN]: {
        name: "Captain",
        action: "Steal",
        description: "Take 2 coins from another player",
        blocks: "Stealing"
    },
    [CARD_TYPES.AMBASSADOR]: {
        name: "Ambassador",
        action: "Exchange",
        description: "Exchange cards with the Court deck",
        blocks: "Stealing"
    },
    [CARD_TYPES.CONTESSA]: {
        name: "Contessa",
        action: null,
        description: "No action",
        blocks: "Assassination"
    }
};

// Action descriptions
export const ACTION_INFO = {
    [ACTIONS.INCOME]: {
        name: "Income",
        cost: 0,
        description: "Take 1 coin from the treasury",
        canBeBlocked: false,
        canBeChallenged: false
    },
    [ACTIONS.FOREIGN_AID]: {
        name: "Foreign Aid",
        cost: 0,
        description: "Take 2 coins from the treasury",
        canBeBlocked: true,
        canBeChallenged: false
    },
    [ACTIONS.COUP]: {
        name: "Coup",
        cost: 7,
        description: "Pay 7 coins to force opponent to lose influence",
        canBeBlocked: false,
        canBeChallenged: false
    },
    [ACTIONS.TAX]: {
        name: "Tax",
        cost: 0,
        description: "Take 3 coins (requires Duke)",
        canBeBlocked: false,
        canBeChallenged: true,
        requiredCard: CARD_TYPES.DUKE
    },
    [ACTIONS.ASSASSINATE]: {
        name: "Assassinate",
        cost: 3,
        description: "Pay 3 coins to force opponent to lose influence (requires Assassin)",
        canBeBlocked: true,
        canBeChallenged: true,
        requiredCard: CARD_TYPES.ASSASSIN
    },
    [ACTIONS.STEAL]: {
        name: "Steal",
        cost: 0,
        description: "Take 2 coins from another player (requires Captain)",
        canBeBlocked: true,
        canBeChallenged: true,
        requiredCard: CARD_TYPES.CAPTAIN
    },
    [ACTIONS.EXCHANGE]: {
        name: "Exchange",
        cost: 0,
        description: "Exchange cards with deck (requires Ambassador)",
        canBeBlocked: false,
        canBeChallenged: true,
        requiredCard: CARD_TYPES.AMBASSADOR
    }
};

export const CHARACTER_COLORS = {
    Duke: "#2196F3",
    Assassin: "#f44336",
    Captain: "#4CAF50",
    Ambassador: "#9C27B0",
    Contessa: "#FF9800"
};

