import { useGameStore } from '../../store/gameStore';
import { roleArt } from '../../utils/roleArt';

export const PlayerHand = () => {
    const myPlayer = useGameStore(state => state.getMyPlayer());
    const gameState = useGameStore(state => state.gameState);
    const actionInProgress = useGameStore(state => state.actionInProgress);

    if (!myPlayer || !myPlayer.cards) {
        return null;
    }

    const needsReveal = gameState === 'CHOOSING_INFLUENCE' &&
        actionInProgress?.awaitingRevealFrom === myPlayer.id;

    return (
        <div className="player-hand">
            <h3>Your Cards</h3>
            <div className="cards-container">
                {myPlayer.cards.map((card, idx) => (
                    <div
                        key={idx}
                        className={`card ${card.revealed ? 'revealed' : ''}`}
                    >
                        <div className="card-content">
                            <span className="card-emoji">
                                {roleArt(card.type)
                                    ? <img
                                        className="card-art"
                                        src={roleArt(card.type)}
                                        alt={card.type}
                                        draggable="false"
                                    />
                                    : (card.revealed ? '\u{1F480}' : '\u{1F3B4}')}
                                {card.revealed && <span className="card-fallen" aria-hidden>{'\u{1F480}'}</span>}
                            </span>
                            <span className="card-type">{card.type}</span>
                        </div>
                    </div>
                ))}
            </div>
            {needsReveal && (
                <p className="reveal-prompt">⚠️ You must reveal a card!</p>
            )}
        </div>
    );
};
