export class Player {
    constructor(id, name, socketId) {
        this.id = id;           // unique player ID (uuid)
        this.name = name;       // player display name
        this.socketId = socketId; // socket connection ID
        this.coins = 2;         // starts with 2 coins
        this.cards = [];        // array of { type: string, revealed: boolean }
        this.influence = 2;     // starts with 2 influence (1 per card)
        this.isAlive = true;    // false when influence reaches 0
        this.isReady = false;   // for lobby
        this.isConnected = true;
    }

    // Add a card to the player's hand
    addCard(cardType) {
        this.cards.push({ type: cardType, revealed: false });
    }

    // Reveal a card (when losing influence)
    revealCard(cardIndex) {
        if (this.cards[cardIndex] && !this.cards[cardIndex].revealed) {
            this.cards[cardIndex].revealed = true;
            this.influence--;
            if (this.influence === 0) {
                this.isAlive = false;
            }
            return this.cards[cardIndex].type;
        }
        return null;
    }

    // Check if player has a specific unrevealed card
    hasCard(cardType) {
        return this.cards.some(card =>
            card.type === cardType && !card.revealed
        );
    }

    // Get safe player data (hides unrevealed cards from other players)
    getSafeData(isOwner = false) {
        return {
            id: this.id,
            name: this.name,
            coins: this.coins,
            influence: this.influence,
            isAlive: this.isAlive,
            isConnected: this.isConnected,
            cards: isOwner ? this.cards : this.cards.map(card => ({
                type: card.revealed ? card.type : 'hidden',
                revealed: card.revealed
            }))
        };
    }
}
