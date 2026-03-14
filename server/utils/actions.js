import { ACTIONS, GAME_STATES } from './constants.js';

export class ActionHandler {
    constructor(game) {
        this.game = game;
    }

    // Validate if action is allowed
    canTakeAction(playerId, action, targetPlayerId = null) {
        const player = this.game.players.find(p => p.id === playerId);
        if (!player || !player.isAlive) return { valid: false, reason: 'Player not found or eliminated' };

        const currentPlayer = this.game.getCurrentPlayer();
        if (currentPlayer.id !== playerId) {
            return { valid: false, reason: 'Not your turn' };
        }

        if (this.game.gameState !== GAME_STATES.ACTIVE_TURN) {
            return { valid: false, reason: 'Cannot take action in current game state' };
        }

        // Check 10+ coin rule
        if (player.coins >= 10 && action !== ACTIONS.COUP) {
            return { valid: false, reason: 'Must Coup with 10+ coins' };
        }

        switch (action) {
            case ACTIONS.INCOME:
                return { valid: true };

            case ACTIONS.FOREIGN_AID:
                return { valid: true };

            case ACTIONS.TAX:
                // Can be challenged but no validation needed here
                return { valid: true };

            case ACTIONS.COUP:
                if (player.coins < 7) {
                    return { valid: false, reason: 'Not enough coins for Coup' };
                }
                if (!targetPlayerId) {
                    return { valid: false, reason: 'Must specify target for Coup' };
                }
                const target = this.game.players.find(p => p.id === targetPlayerId);
                if (!target || !target.isAlive) {
                    return { valid: false, reason: 'Invalid target' };
                }
                if (target.id === playerId) {
                    return { valid: false, reason: 'Cannot target yourself' };
                }
                return { valid: true };

            case ACTIONS.ASSASSINATE:
                if (player.coins < 3) {
                    return { valid: false, reason: 'Not enough coins for Assassination' };
                }
                if (!targetPlayerId) {
                    return { valid: false, reason: 'Must specify target' };
                }
                const assassinTarget = this.game.players.find(p => p.id === targetPlayerId);
                if (!assassinTarget || !assassinTarget.isAlive) {
                    return { valid: false, reason: 'Invalid target' };
                }
                if (assassinTarget.id === playerId) {
                    return { valid: false, reason: 'Cannot target yourself' };
                }
                return { valid: true };

            case ACTIONS.STEAL:
                if (!targetPlayerId) {
                    return { valid: false, reason: 'Must specify target' };
                }
                const stealTarget = this.game.players.find(p => p.id === targetPlayerId);
                if (!stealTarget || !stealTarget.isAlive) {
                    return { valid: false, reason: 'Invalid target' };
                }
                if (stealTarget.id === playerId) {
                    return { valid: false, reason: 'Cannot target yourself' };
                }
                return { valid: true };

            case ACTIONS.EXCHANGE:
                return { valid: true };

            default:
                return { valid: false, reason: 'Unknown action' };
        }
    }

    // Execute action
    executeAction(playerId, action, targetPlayerId = null) {
        const validation = this.canTakeAction(playerId, action, targetPlayerId);
        if (!validation.valid) {
            return { success: false, message: validation.reason };
        }

        switch (action) {
            case ACTIONS.INCOME:
                return this.executeIncome(playerId);
            case ACTIONS.FOREIGN_AID:
                return this.executeForeignAid(playerId);
            case ACTIONS.TAX:
                return this.executeTax(playerId);
            case ACTIONS.COUP:
                return this.executeCoup(playerId, targetPlayerId);
            case ACTIONS.ASSASSINATE:
                return this.executeAssassinate(playerId, targetPlayerId);
            case ACTIONS.STEAL:
                return this.executeSteal(playerId, targetPlayerId);
            case ACTIONS.EXCHANGE:
                return this.executeExchange(playerId);
            default:
                return { success: false, message: 'Action not implemented yet' };
        }
    }

    // Execute INCOME action
    executeIncome(playerId) {
        const player = this.game.players.find(p => p.id === playerId);
        player.coins += 1;

        this.game.actionHistory.push({
            timestamp: Date.now(),
            player: player.name,
            action: ACTIONS.INCOME,
            result: 'success',
            details: '+1 coin'
        });

        this.game.nextTurn();
        return { success: true, message: `${player.name} took Income (+1 coin)` };
    }

    // Execute FOREIGN AID (can be blocked by Duke)
    executeForeignAid(playerId) {
        const player = this.game.players.find(p => p.id === playerId);

        // Set up block window
        this.game.gameState = GAME_STATES.WAITING_BLOCK;
        this.game.actionInProgress = {
            type: ACTIONS.FOREIGN_AID,
            actingPlayer: playerId,
            targetPlayer: null,
            blockable: true,
            blockableBy: ['Duke'],
            canChallenge: false
        };

        this.game.actionHistory.push({
            timestamp: Date.now(),
            player: player.name,
            action: ACTIONS.FOREIGN_AID,
            result: 'pending',
            details: 'Can be blocked by Duke'
        });

        return {
            success: true,
            message: `${player.name} taking Foreign Aid`,
            awaitingBlock: true,
            timeout: 10000 // 10 second block window
        };
    }

    // Resolve Foreign Aid after block window
    resolveForeignAid() {
        const action = this.game.actionInProgress;
        const player = this.game.players.find(p => p.id === action.actingPlayer);

        player.coins += 2;

        const lastAction = this.game.actionHistory[this.game.actionHistory.length - 1];
        lastAction.result = 'success';
        lastAction.details = '+2 coins';

        this.game.nextTurn();
        return { success: true, message: `${player.name} gained 2 coins` };
    }

    // Execute TAX (can be challenged)
    executeTax(playerId) {
        const player = this.game.players.find(p => p.id === playerId);

        // Set up challenge window
        this.game.gameState = GAME_STATES.WAITING_CHALLENGE;
        this.game.actionInProgress = {
            type: ACTIONS.TAX,
            actingPlayer: playerId,
            targetPlayer: null,
            claimedCharacter: 'Duke',
            canChallenge: true,
            blockable: false
        };

        this.game.actionHistory.push({
            timestamp: Date.now(),
            player: player.name,
            action: ACTIONS.TAX,
            result: 'pending',
            details: 'Claiming Duke'
        });

        return {
            success: true,
            message: `${player.name} taking Tax (claiming Duke)`,
            awaitingChallenge: true,
            timeout: 10000
        };
    }

    // Resolve Tax after challenge window
    resolveTax() {
        const action = this.game.actionInProgress;
        const player = this.game.players.find(p => p.id === action.actingPlayer);

        player.coins += 3;

        const lastAction = this.game.actionHistory[this.game.actionHistory.length - 1];
        lastAction.result = 'success';
        lastAction.details = '+3 coins';

        this.game.nextTurn();
        return { success: true, message: `${player.name} gained 3 coins` };
    }

    // Execute COUP action
    executeCoup(playerId, targetPlayerId) {
        const player = this.game.players.find(p => p.id === playerId);
        const target = this.game.players.find(p => p.id === targetPlayerId);

        // Deduct coins
        player.coins -= 7;

        // Set game state to waiting for target to reveal card
        this.game.gameState = GAME_STATES.CHOOSING_INFLUENCE;
        this.game.actionInProgress = {
            type: ACTIONS.COUP,
            actingPlayer: playerId,
            targetPlayer: targetPlayerId,
            awaitingRevealFrom: targetPlayerId
        };

        this.game.actionHistory.push({
            timestamp: Date.now(),
            player: player.name,
            action: ACTIONS.COUP,
            target: target.name,
            result: 'pending',
            details: 'Target must reveal card'
        });

        return {
            success: true,
            message: `${player.name} Couped ${target.name}`,
            requiresReveal: true,
            targetPlayerId
        };
    }

    // Execute ASSASSINATE (can be challenged and blocked)
    executeAssassinate(playerId, targetPlayerId) {
        const player = this.game.players.find(p => p.id === playerId);
        const target = this.game.players.find(p => p.id === targetPlayerId);

        // Deduct coins immediately
        player.coins -= 3;

        // Set up challenge window first
        this.game.gameState = GAME_STATES.WAITING_CHALLENGE;
        this.game.actionInProgress = {
            type: ACTIONS.ASSASSINATE,
            actingPlayer: playerId,
            targetPlayer: targetPlayerId,
            claimedCharacter: 'Assassin',
            canChallenge: true,
            blockable: true,
            blockableBy: ['Contessa']
        };

        this.game.actionHistory.push({
            timestamp: Date.now(),
            player: player.name,
            action: ACTIONS.ASSASSINATE,
            target: target.name,
            result: 'pending',
            details: 'Claiming Assassin, paid 3 coins'
        });

        return {
            success: true,
            message: `${player.name} assassinating ${target.name}`,
            awaitingChallenge: true,
            timeout: 10000
        };
    }

    // Resolve Assassinate (after challenge/block phase)
    resolveAssassinate() {
        const action = this.game.actionInProgress;
        const target = this.game.players.find(p => p.id === action.targetPlayer);

        // Target must reveal card
        this.game.gameState = GAME_STATES.CHOOSING_INFLUENCE;
        this.game.actionInProgress.awaitingRevealFrom = action.targetPlayer;

        return {
            success: true,
            message: `${target.name} must reveal a card`,
            requiresReveal: true,
            targetPlayerId: action.targetPlayer
        };
    }

    // Execute STEAL (can be challenged and blocked)
    executeSteal(playerId, targetPlayerId) {
        const player = this.game.players.find(p => p.id === playerId);
        const target = this.game.players.find(p => p.id === targetPlayerId);

        // Set up challenge window
        this.game.gameState = GAME_STATES.WAITING_CHALLENGE;
        this.game.actionInProgress = {
            type: ACTIONS.STEAL,
            actingPlayer: playerId,
            targetPlayer: targetPlayerId,
            claimedCharacter: 'Captain',
            canChallenge: true,
            blockable: true,
            blockableBy: ['Captain', 'Ambassador']
        };

        this.game.actionHistory.push({
            timestamp: Date.now(),
            player: player.name,
            action: ACTIONS.STEAL,
            target: target.name,
            result: 'pending',
            details: 'Claiming Captain'
        });

        return {
            success: true,
            message: `${player.name} stealing from ${target.name}`,
            awaitingChallenge: true,
            timeout: 10000
        };
    }

    // Resolve Steal
    resolveSteal() {
        const action = this.game.actionInProgress;
        const player = this.game.players.find(p => p.id === action.actingPlayer);
        const target = this.game.players.find(p => p.id === action.targetPlayer);

        const amount = Math.min(2, target.coins);
        target.coins -= amount;
        player.coins += amount;

        const lastAction = this.game.actionHistory[this.game.actionHistory.length - 1];
        lastAction.result = 'success';
        lastAction.details = `Stole ${amount} coins`;

        this.game.nextTurn();
        return { success: true, message: `${player.name} stole ${amount} coins from ${target.name}` };
    }

    // Execute EXCHANGE (can be challenged)
    executeExchange(playerId) {
        const player = this.game.players.find(p => p.id === playerId);

        // Set up challenge window
        this.game.gameState = GAME_STATES.WAITING_CHALLENGE;
        this.game.actionInProgress = {
            type: ACTIONS.EXCHANGE,
            actingPlayer: playerId,
            targetPlayer: null,
            claimedCharacter: 'Ambassador',
            canChallenge: true,
            blockable: false
        };

        this.game.actionHistory.push({
            timestamp: Date.now(),
            player: player.name,
            action: ACTIONS.EXCHANGE,
            result: 'pending',
            details: 'Claiming Ambassador'
        });

        return {
            success: true,
            message: `${player.name} exchanging cards`,
            awaitingChallenge: true,
            timeout: 10000
        };
    }

    // Resolve Exchange (draw cards and let player choose)
    resolveExchange() {
        const action = this.game.actionInProgress;
        const player = this.game.players.find(p => p.id === action.actingPlayer);

        // Draw 2 cards
        const drawnCards = [
            this.game.drawCard(),
            this.game.drawCard()
        ];

        // Player sees their current cards + drawn cards
        const currentCards = player.cards
            .filter(c => !c.revealed)
            .map(c => c.type);

        const allCards = [...currentCards, ...drawnCards];

        // Store in action for player selection
        this.game.actionInProgress.exchangeCards = allCards;
        this.game.actionInProgress.mustKeep = currentCards.length; // How many to keep
        this.game.actionInProgress.awaitingCardSelection = true;

        return {
            success: true,
            message: `${player.name} drew cards`,
            requiresCardSelection: true,
            cards: allCards,
            mustKeep: currentCards.length
        };
    }

    // Handle card selection for Exchange
    selectExchangeCards(playerId, selectedIndices) {
        const action = this.game.actionInProgress;
        if (action.actingPlayer !== playerId) {
            return { success: false, message: 'Not your action' };
        }

        const player = this.game.players.find(p => p.id === playerId);
        const allCards = action.exchangeCards;
        const mustKeep = action.mustKeep;

        if (selectedIndices.length !== mustKeep) {
            return { success: false, message: `Must select exactly ${mustKeep} cards` };
        }

        // Update player's cards
        const newCards = selectedIndices.map(i => allCards[i]);
        player.cards = player.cards.filter(c => c.revealed); // Keep revealed cards
        newCards.forEach(cardType => player.addCard(cardType));

        // Return non-selected cards to deck
        const returnedCards = allCards.filter((card, i) => !selectedIndices.includes(i));
        this.game.deck.push(...returnedCards);
        this.game.shuffleDeck();

        const lastAction = this.game.actionHistory[this.game.actionHistory.length - 1];
        lastAction.result = 'success';
        lastAction.details = 'Exchanged cards';

        this.game.nextTurn();
        return { success: true, message: `${player.name} exchanged cards` };
    }

    // Handle card reveal (when player loses influence)
    revealCard(playerId, cardIndex) {
        const player = this.game.players.find(p => p.id === playerId);

        if (!this.game.actionInProgress ||
            this.game.actionInProgress.awaitingRevealFrom !== playerId) {
            return { success: false, message: 'Not awaiting card reveal from this player' };
        }

        const revealedCard = player.revealCard(cardIndex);
        if (!revealedCard) {
            return { success: false, message: 'Invalid card index' };
        }

        // Add to discard pile
        this.game.discardPile.push(revealedCard);

        // Update action history
        const lastAction = this.game.actionHistory[this.game.actionHistory.length - 1];
        if (lastAction) {
            lastAction.result = 'success';
            lastAction.details = lastAction.details ?
                `${lastAction.details} - ${player.name} revealed ${revealedCard}` :
                `${player.name} revealed ${revealedCard}`;
        }

        // Check win condition
        if (this.game.checkWinCondition()) {
            return {
                success: true,
                message: `${player.name} revealed ${revealedCard}`,
                gameOver: true
            };
        }

        // Move to next turn
        this.game.nextTurn();

        return {
            success: true,
            message: `${player.name} revealed ${revealedCard}`,
            eliminated: !player.isAlive
        };
    }

    // Handle challenge
    handleChallenge(challengerId) {
        const action = this.game.actionInProgress;

        if (!action || !action.canChallenge) {
            return { success: false, message: 'No challengeable action in progress' };
        }

        if (this.game.gameState !== GAME_STATES.WAITING_CHALLENGE) {
            return { success: false, message: 'Challenge window has closed' };
        }

        const claimer = this.game.players.find(p => p.id === action.actingPlayer);
        const challenger = this.game.players.find(p => p.id === challengerId);

        if (!challenger || !challenger.isAlive) {
            return { success: false, message: 'Invalid challenger' };
        }

        if (challengerId === action.actingPlayer) {
            return { success: false, message: 'Cannot challenge yourself' };
        }

        // Check if claimer has the claimed character
        const hasCard = claimer.hasCard(action.claimedCharacter);

        this.game.gameState = GAME_STATES.RESOLVING_CHALLENGE;

        if (hasCard) {
            // Claimer wins challenge
            return this.resolveSuccessfulDefense(claimer, challenger, action);
        } else {
            // Challenger wins
            return this.resolveFailedClaim(claimer, challenger, action);
        }
    }

    // Claimer had the card (challenger loses influence)
    resolveSuccessfulDefense(claimer, challenger, action) {
        // Find and reveal claimer's card
        const cardIndex = claimer.cards.findIndex(
            c => c.type === action.claimedCharacter && !c.revealed
        );
        const cardType = claimer.cards[cardIndex].type;

        // Reveal card temporarily
        claimer.cards[cardIndex].revealed = true;

        // Add to action history
        this.game.actionHistory.push({
            timestamp: Date.now(),
            player: challenger.name,
            action: 'CHALLENGE',
            target: claimer.name,
            result: 'failed',
            details: `${claimer.name} revealed ${cardType}`
        });

        // Challenger must reveal a card
        this.game.gameState = GAME_STATES.CHOOSING_INFLUENCE;
        this.game.actionInProgress.challengeResult = {
            success: true,
            challengerId: challenger.id,
            claimerId: claimer.id,
            revealedCard: cardType,
            revealedCardIndex: cardIndex,
            awaitingRevealFrom: challenger.id
        };

        return {
            success: true,
            message: `${claimer.name} revealed ${cardType}! ${challenger.name} must lose influence`,
            challengeFailed: true,
            requiresReveal: true,
            targetPlayerId: challenger.id,
            revealedCard: cardType
        };
    }

    // Handle reveal after challenge loss
    handleChallengeReveal(playerId, cardIndex) {
        const action = this.game.actionInProgress;
        const challengeResult = action.challengeResult;

        if (!challengeResult || challengeResult.awaitingRevealFrom !== playerId) {
            return { success: false, message: 'Not awaiting reveal from this player' };
        }

        const player = this.game.players.find(p => p.id === playerId);
        const revealedCard = player.revealCard(cardIndex);

        if (!revealedCard) {
            return { success: false, message: 'Invalid card' };
        }

        this.game.discardPile.push(revealedCard);

        // If challenger lost, claimer gets to reshuffle their revealed card and draw new one
        if (challengeResult.success && player.id === challengeResult.challengerId) {
            const claimer = this.game.players.find(p => p.id === challengeResult.claimerId);
            const claimerCard = claimer.cards[challengeResult.revealedCardIndex];

            // Return card to deck and draw new one
            claimerCard.revealed = false;
            this.game.deck.push(claimerCard.type);
            this.game.shuffleDeck();
            claimerCard.type = this.game.drawCard();
        }

        // Check if player was eliminated
        if (this.game.checkWinCondition()) {
            return {
                success: true,
                message: `${player.name} was eliminated`,
                gameOver: true
            };
        }

        // Continue with the action (it was successfully defended)
        delete action.challengeResult;

        // Move to appropriate next state
        if (action.blockable) {
            // If action can be blocked, enter block window
            this.game.gameState = GAME_STATES.WAITING_BLOCK;
            return {
                success: true,
                message: `${player.name} revealed ${revealedCard}. Waiting for blocks...`,
                awaitingBlock: true
            };
        } else {
            // Resolve action immediately
            return this.resolveActionAfterChallenge();
        }
    }

    // Claimer didn't have the card (claimer loses influence, action fails)
    resolveFailedClaim(claimer, challenger, action) {
        this.game.actionHistory.push({
            timestamp: Date.now(),
            player: challenger.name,
            action: 'CHALLENGE',
            target: claimer.name,
            result: 'success',
            details: `${claimer.name} was bluffing`
        });

        // Claimer must reveal a card
        this.game.gameState = GAME_STATES.CHOOSING_INFLUENCE;
        this.game.actionInProgress.challengeResult = {
            success: false,
            challengerId: challenger.id,
            claimerId: claimer.id,
            awaitingRevealFrom: claimer.id,
            actionFails: true
        };

        return {
            success: true,
            message: `${claimer.name} was bluffing! Must lose influence`,
            challengeSucceeded: true,
            requiresReveal: true,
            targetPlayerId: claimer.id
        };
    }

    // Handle reveal when claimer loses challenge
    handleFailedClaimReveal(playerId, cardIndex) {
        const action = this.game.actionInProgress;
        const challengeResult = action.challengeResult;

        if (!challengeResult || challengeResult.awaitingRevealFrom !== playerId) {
            return { success: false, message: 'Not awaiting reveal from this player' };
        }

        const player = this.game.players.find(p => p.id === playerId);
        const revealedCard = player.revealCard(cardIndex);

        if (!revealedCard) {
            return { success: false, message: 'Invalid card' };
        }

        this.game.discardPile.push(revealedCard);

        // Update action history
        const lastAction = this.game.actionHistory[this.game.actionHistory.length - 1];
        lastAction.details += ` - ${player.name} revealed ${revealedCard}, action failed`;

        // Check win condition
        if (this.game.checkWinCondition()) {
            return {
                success: true,
                message: `${player.name} was eliminated`,
                gameOver: true
            };
        }

        // Action fails, move to next turn
        this.game.nextTurn();

        return {
            success: true,
            message: `${player.name} revealed ${revealedCard}. Action failed, moving to next turn`,
            actionFailed: true
        };
    }

    // Resolve action after successful defense (no blocks)
    resolveActionAfterChallenge() {
        const action = this.game.actionInProgress;

        switch (action.type) {
            case ACTIONS.TAX:
                return this.resolveTax();
            case ACTIONS.ASSASSINATE:
                return this.resolveAssassinate();
            case ACTIONS.STEAL:
                return this.resolveSteal();
            case ACTIONS.EXCHANGE:
                return this.resolveExchange();
            default:
                return { success: false, message: 'Unknown action type' };
        }
    }

    // Handle no challenge (timeout)
    handleNoChallenge() {
        const action = this.game.actionInProgress;

        if (action.blockable) {
            // Move to block window
            this.game.gameState = GAME_STATES.WAITING_BLOCK;
            return {
                success: true,
                message: 'No challenge. Waiting for blocks...',
                awaitingBlock: true
            };
        } else {
            // Resolve action
            return this.resolveActionAfterChallenge();
        }
    }

    // Handle block attempt
    handleBlock(blockerId, blockingCharacter) {
        const action = this.game.actionInProgress;

        if (!action || !action.blockable) {
            return { success: false, message: 'No blockable action in progress' };
        }

        if (this.game.gameState !== GAME_STATES.WAITING_BLOCK) {
            return { success: false, message: 'Block window has closed' };
        }

        const blocker = this.game.players.find(p => p.id === blockerId);
        const actor = this.game.players.find(p => p.id === action.actingPlayer);

        if (!blocker || !blocker.isAlive) {
            return { success: false, message: 'Invalid blocker' };
        }

        // Validate blocking character is allowed for this action
        if (!action.blockableBy.includes(blockingCharacter)) {
            return { success: false, message: `${blockingCharacter} cannot block ${action.type}` };
        }

        // Special rule: only target can block Assassination
        if (action.type === ACTIONS.ASSASSINATE && blockerId !== action.targetPlayer) {
            return { success: false, message: 'Only target can block assassination' };
        }

        // Set up challenge window for the block
        this.game.gameState = GAME_STATES.WAITING_BLOCK_CHALLENGE;
        this.game.actionInProgress.blockAttempt = {
            blockerId: blockerId,
            blockingCharacter: blockingCharacter,
            canChallenge: true
        };

        this.game.actionHistory.push({
            timestamp: Date.now(),
            player: blocker.name,
            action: 'BLOCK',
            target: actor.name,
            result: 'pending',
            details: `Blocking with ${blockingCharacter}`
        });

        return {
            success: true,
            message: `${blocker.name} blocking with ${blockingCharacter}`,
            awaitingBlockChallenge: true,
            blockingCharacter: blockingCharacter,
            blockerId: blockerId,
            timeout: 10000
        };
    }

    // Handle challenge on block
    handleBlockChallenge(challengerId) {
        const action = this.game.actionInProgress;
        const blockAttempt = action.blockAttempt;

        if (!blockAttempt || !blockAttempt.canChallenge) {
            return { success: false, message: 'No challengeable block in progress' };
        }

        if (this.game.gameState !== GAME_STATES.WAITING_BLOCK_CHALLENGE) {
            return { success: false, message: 'Block challenge window has closed' };
        }

        const blocker = this.game.players.find(p => p.id === blockAttempt.blockerId);
        const challenger = this.game.players.find(p => p.id === challengerId);

        if (!challenger || !challenger.isAlive) {
            return { success: false, message: 'Invalid challenger' };
        }

        if (challengerId === blockAttempt.blockerId) {
            return { success: false, message: 'Cannot challenge yourself' };
        }

        // Check if blocker has the blocking character
        const hasCard = blocker.hasCard(blockAttempt.blockingCharacter);

        this.game.gameState = GAME_STATES.RESOLVING_BLOCK_CHALLENGE;

        if (hasCard) {
            // Block succeeds, challenger loses influence
            return this.resolveSuccessfulBlock(blocker, challenger, blockAttempt);
        } else {
            // Block fails, blocker loses influence
            return this.resolveFailedBlock(blocker, challenger, blockAttempt);
        }
    }

    // Block succeeded (challenger loses influence, action blocked)
    resolveSuccessfulBlock(blocker, challenger, blockAttempt) {
        // Find blocker's card
        const cardIndex = blocker.cards.findIndex(
            c => c.type === blockAttempt.blockingCharacter && !c.revealed
        );
        const cardType = blocker.cards[cardIndex].type;

        // Mark as temporarily revealed
        blocker.cards[cardIndex].revealed = true;

        this.game.actionHistory.push({
            timestamp: Date.now(),
            player: challenger.name,
            action: 'CHALLENGE_BLOCK',
            target: blocker.name,
            result: 'failed',
            details: `${blocker.name} revealed ${cardType}`
        });

        // Challenger must reveal
        this.game.gameState = GAME_STATES.CHOOSING_INFLUENCE;
        this.game.actionInProgress.blockChallengeResult = {
            success: true,
            blockerId: blocker.id,
            challengerId: challenger.id,
            revealedCard: cardType,
            revealedCardIndex: cardIndex,
            awaitingRevealFrom: challenger.id,
            blockSucceeds: true
        };

        return {
            success: true,
            message: `${blocker.name} revealed ${cardType}! ${challenger.name} must lose influence`,
            requiresReveal: true,
            targetPlayerId: challenger.id,
            blockSucceeds: true
        };
    }

    // Block failed (blocker loses influence, action proceeds)
    resolveFailedBlock(blocker, challenger, blockAttempt) {
        this.game.actionHistory.push({
            timestamp: Date.now(),
            player: challenger.name,
            action: 'CHALLENGE_BLOCK',
            target: blocker.name,
            result: 'success',
            details: `${blocker.name} was bluffing`
        });

        // Blocker must reveal
        this.game.gameState = GAME_STATES.CHOOSING_INFLUENCE;
        this.game.actionInProgress.blockChallengeResult = {
            success: false,
            blockerId: blocker.id,
            challengerId: challenger.id,
            awaitingRevealFrom: blocker.id,
            blockFails: true
        };

        return {
            success: true,
            message: `${blocker.name} was bluffing! Must lose influence`,
            requiresReveal: true,
            targetPlayerId: blocker.id,
            blockFails: true
        };
    }

    // Handle reveal after block challenge
    handleBlockChallengeReveal(playerId, cardIndex) {
        const action = this.game.actionInProgress;
        const result = action.blockChallengeResult;

        if (!result || result.awaitingRevealFrom !== playerId) {
            return { success: false, message: 'Not awaiting reveal from this player' };
        }

        const player = this.game.players.find(p => p.id === playerId);
        const revealedCard = player.revealCard(cardIndex);

        if (!revealedCard) {
            return { success: false, message: 'Invalid card' };
        }

        this.game.discardPile.push(revealedCard);

        // If blocker won challenge, reshuffle their card
        if (result.blockSucceeds && player.id === result.challengerId) {
            const blocker = this.game.players.find(p => p.id === result.blockerId);
            const blockerCard = blocker.cards[result.revealedCardIndex];

            blockerCard.revealed = false;
            this.game.deck.push(blockerCard.type);
            this.game.shuffleDeck();
            blockerCard.type = this.game.drawCard();
        }

        // Check win condition
        if (this.game.checkWinCondition()) {
            return {
                success: true,
                message: `${player.name} was eliminated`,
                gameOver: true
            };
        }

        if (result.blockSucceeds) {
            // Action is blocked, move to next turn
            const lastAction = this.game.actionHistory
                .filter(a => a.action !== 'BLOCK' && a.action !== 'CHALLENGE_BLOCK')
                .pop();
            if (lastAction) {
                lastAction.result = 'blocked';
            }

            this.game.nextTurn();

            return {
                success: true,
                message: `${player.name} revealed ${revealedCard}. Action blocked, moving to next turn`,
                actionBlocked: true
            };
        } else {
            // Block failed, continue with action
            delete action.blockAttempt;
            delete action.blockChallengeResult;
            return this.resolveActionAfterChallenge();
        }
    }

    // Handle no block challenge (timeout - block succeeds)
    handleNoBlockChallenge() {
        const action = this.game.actionInProgress;

        // Block succeeds without challenge
        const lastAction = this.game.actionHistory
            .filter(a => a.action !== 'BLOCK' && a.action !== 'CHALLENGE_BLOCK')
            .pop();
        if (lastAction) {
            lastAction.result = 'blocked';
        }

        this.game.actionHistory[this.game.actionHistory.length - 1].result = 'success';

        this.game.nextTurn();

        return {
            success: true,
            message: 'Block succeeded. Moving to next turn',
            actionBlocked: true
        };
    }

    // Handle no block (timeout - action proceeds)
    handleNoBlock() {
        const action = this.game.actionInProgress;

        // No block, resolve action
        return this.resolveActionAfterChallenge();
    }

    // Handle pass (immediately resolve the current waiting phase)
    handlePass(playerId) {
        const action = this.game.actionInProgress;
        if (!action) {
            return { success: false, message: 'No action in progress' };
        }

        // Cannot pass on your own action
        if (action.actingPlayer === playerId && this.game.gameState === GAME_STATES.WAITING_CHALLENGE) {
            return { success: false, message: 'Cannot pass on your own action' };
        }

        switch (this.game.gameState) {
            case GAME_STATES.WAITING_CHALLENGE:
                return this.handleNoChallenge();

            case GAME_STATES.WAITING_BLOCK:
                return this.handleNoBlock();

            case GAME_STATES.WAITING_BLOCK_CHALLENGE:
                // Cannot pass on your own block
                if (action.blockAttempt && action.blockAttempt.blockerId === playerId) {
                    return { success: false, message: 'Cannot pass on your own block' };
                }
                return this.handleNoBlockChallenge();

            default:
                return { success: false, message: 'Cannot pass in current state' };
        }
    }
}
