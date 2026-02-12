/**
 * Coup Game Constants
 * Defines card types, actions, and game states for the Coup card game
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

// Action requirements and effects
export const ACTION_CONFIG = {
  [ACTIONS.INCOME]: {
    cost: 0,
    coins: 1,
    requiresTarget: false,
    canBeBlocked: false,
    canBeChallenged: false
  },
  [ACTIONS.FOREIGN_AID]: {
    cost: 0,
    coins: 2,
    requiresTarget: false,
    canBeBlocked: true,
    blockableBy: [CARD_TYPES.DUKE],
    canBeChallenged: false
  },
  [ACTIONS.COUP]: {
    cost: 7,
    coins: 0,
    requiresTarget: true,
    canBeBlocked: false,
    canBeChallenged: false
  },
  [ACTIONS.TAX]: {
    cost: 0,
    coins: 3,
    requiresTarget: false,
    canBeBlocked: false,
    canBeChallenged: true,
    requiredCard: CARD_TYPES.DUKE
  },
  [ACTIONS.ASSASSINATE]: {
    cost: 3,
    coins: 0,
    requiresTarget: true,
    canBeBlocked: true,
    blockableBy: [CARD_TYPES.CONTESSA],
    canBeChallenged: true,
    requiredCard: CARD_TYPES.ASSASSIN
  },
  [ACTIONS.STEAL]: {
    cost: 0,
    coins: 2,
    requiresTarget: true,
    canBeBlocked: true,
    blockableBy: [CARD_TYPES.CAPTAIN, CARD_TYPES.AMBASSADOR],
    canBeChallenged: true,
    requiredCard: CARD_TYPES.CAPTAIN
  },
  [ACTIONS.EXCHANGE]: {
    cost: 0,
    coins: 0,
    requiresTarget: false,
    canBeBlocked: false,
    canBeChallenged: true,
    requiredCard: CARD_TYPES.AMBASSADOR
  }
};

// Game configuration
export const GAME_CONFIG = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 6,
  STARTING_COINS: 2,
  STARTING_INFLUENCES: 2,
  COUP_COST: 7,
  MANDATORY_COUP_COINS: 10
};
