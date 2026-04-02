import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';

export const ChallengePanel = () => {
    const socket = useGameStore(state => state.socket);
    const gameId = useGameStore(state => state.gameId);
    const playerId = useGameStore(state => state.playerId);
    const gameState = useGameStore(state => state.gameState);
    const actionInProgress = useGameStore(state => state.actionInProgress);
    const players = useGameStore(state => state.players);
    const myPlayer = useGameStore(state => state.getMyPlayer());

    const [timer, setTimer] = useState(10);
    const [selectedBlock, setSelectedBlock] = useState(null);

    useEffect(() => {
        if (['WAITING_CHALLENGE', 'WAITING_BLOCK', 'WAITING_BLOCK_CHALLENGE'].includes(gameState)) {
            setTimer(10);
            const interval = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [gameState]);

    useEffect(() => {
        setSelectedBlock(null);
    }, [gameState]);

    if (!actionInProgress) return null;

    const actor = players.find(p => p.id === actionInProgress.actingPlayer);
    const target = actionInProgress.targetPlayer ?
        players.find(p => p.id === actionInProgress.targetPlayer) : null;
    const alreadyPassed = actionInProgress.passedPlayers?.includes(playerId);
    const passCount = actionInProgress.passedPlayers?.length || 0;

    // Challenge window
    if (gameState === 'WAITING_CHALLENGE' && playerId !== actionInProgress.actingPlayer) {
        return (
            <div className="challenge-panel">
                <div className="panel-header">
                    <h3>Challenge Window</h3>
                    <span className="timer">{timer}s</span>
                </div>
                <p>
                    {actor?.name} is claiming {actionInProgress.claimedCharacter} for {actionInProgress.type}
                    {target && ` targeting ${target.name}`}
                </p>
                <div className="panel-actions">
                    <button
                        onClick={() => handleChallenge()}
                        className="challenge-btn"
                        disabled={alreadyPassed}
                    >
                        Challenge
                    </button>
                    <button
                        onClick={() => handlePass()}
                        className="pass-btn"
                        disabled={alreadyPassed}
                    >
                        {alreadyPassed ? 'Passed' : 'Pass'}
                    </button>
                </div>
                {passCount > 0 && (
                    <p className="pass-info">{passCount} player(s) passed</p>
                )}
            </div>
        );
    }

    // Block window
    if (gameState === 'WAITING_BLOCK') {
        const canBlock = actionInProgress.blockableBy && actionInProgress.blockableBy.length > 0;
        const canIBlock = actionInProgress.type === 'ASSASSINATE' ?
            playerId === actionInProgress.targetPlayer :
            playerId !== actionInProgress.actingPlayer;

        if (!canBlock || !canIBlock) return null;

        return (
            <div className="challenge-panel">
                <div className="panel-header">
                    <h3>Block Window</h3>
                    <span className="timer">{timer}s</span>
                </div>
                <p>
                    {actor?.name} is using {actionInProgress.type}
                    {target && ` on ${target.name}`}
                </p>
                <p>Blockable by: {actionInProgress.blockableBy.join(', ')}</p>

                {!selectedBlock ? (
                    <div className="panel-actions">
                        {actionInProgress.blockableBy.map(character => (
                            <button
                                key={character}
                                onClick={() => setSelectedBlock(character)}
                                className="block-btn"
                                disabled={alreadyPassed}
                            >
                                Block with {character}
                            </button>
                        ))}
                        <button
                            onClick={() => handlePass()}
                            className="pass-btn"
                            disabled={alreadyPassed}
                        >
                            {alreadyPassed ? 'Passed' : 'Pass'}
                        </button>
                    </div>
                ) : (
                    <div className="panel-actions">
                        <p>Block with {selectedBlock}?</p>
                        <button
                            onClick={() => handleBlock(selectedBlock)}
                            className="confirm-btn"
                        >
                            Confirm
                        </button>
                        <button
                            onClick={() => setSelectedBlock(null)}
                            className="cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                )}
                {passCount > 0 && (
                    <p className="pass-info">{passCount} player(s) passed</p>
                )}
            </div>
        );
    }

    // Block challenge window
    if (gameState === 'WAITING_BLOCK_CHALLENGE' &&
        playerId !== actionInProgress.blockAttempt?.blockerId) {
        const blocker = players.find(p => p.id === actionInProgress.blockAttempt.blockerId);

        return (
            <div className="challenge-panel">
                <div className="panel-header">
                    <h3>Challenge Block</h3>
                    <span className="timer">{timer}s</span>
                </div>
                <p>
                    {blocker?.name} is blocking with {actionInProgress.blockAttempt.blockingCharacter}
                </p>
                <div className="panel-actions">
                    <button
                        onClick={() => handleChallengeBlock()}
                        className="challenge-btn"
                        disabled={alreadyPassed}
                    >
                        Challenge Block
                    </button>
                    <button
                        onClick={() => handlePass()}
                        className="pass-btn"
                        disabled={alreadyPassed}
                    >
                        {alreadyPassed ? 'Passed' : 'Pass'}
                    </button>
                </div>
                {passCount > 0 && (
                    <p className="pass-info">{passCount} player(s) passed</p>
                )}
            </div>
        );
    }

    // Card reveal window
    const awaitingReveal =
        actionInProgress.awaitingRevealFrom === playerId ||
        actionInProgress.challengeResult?.awaitingRevealFrom === playerId ||
        actionInProgress.blockChallengeResult?.awaitingRevealFrom === playerId;

    if (gameState === 'CHOOSING_INFLUENCE' && awaitingReveal) {
        return (
            <div className="challenge-panel reveal-panel">
                <h3>Choose a Card to Reveal</h3>
                <div className="reveal-cards">
                    {myPlayer?.cards.map((card, idx) => (
                        !card.revealed && (
                            <button
                                key={idx}
                                onClick={() => handleRevealCard(idx)}
                                className="reveal-card-btn"
                            >
                                Reveal {card.type}
                            </button>
                        )
                    ))}
                </div>
            </div>
        );
    }

    // Card selection for Exchange
    if (actionInProgress.awaitingCardSelection &&
        actionInProgress.actingPlayer === playerId) {
        return <ExchangeCardSelection />;
    }

    return null;

    // Helper functions
    function handleChallenge() {
        if (!socket || !gameId) return;
        socket.emit('challenge', { gameId, playerId }, (response) => {
            if (!response.success) {
                alert(response.message);
            }
        });
    }

    function handleBlock(blockingCharacter) {
        if (!socket || !gameId) return;
        socket.emit('block', { gameId, playerId, blockingCharacter }, (response) => {
            if (!response.success) {
                alert(response.message);
            }
        });
    }

    function handleChallengeBlock() {
        if (!socket || !gameId) return;
        socket.emit('challengeBlock', { gameId, playerId }, (response) => {
            if (!response.success) {
                alert(response.message);
            }
        });
    }

    function handlePass() {
        if (!socket || !gameId) return;
        socket.emit('pass', { gameId, playerId }, (response) => {
            if (!response?.success) {
                console.log('Pass failed:', response?.error || response?.message);
            }
        });
    }

    function handleRevealCard(cardIndex) {
        if (!socket || !gameId) return;
        socket.emit('revealCard', { gameId, playerId, cardIndex }, (response) => {
            if (!response.success) {
                alert(response.message);
            }
        });
    }
};

// Separate component for Exchange card selection
function ExchangeCardSelection() {
    const socket = useGameStore(state => state.socket);
    const gameId = useGameStore(state => state.gameId);
    const playerId = useGameStore(state => state.playerId);
    const actionInProgress = useGameStore(state => state.actionInProgress);

    const [selectedIndices, setSelectedIndices] = useState([]);

    const cards = actionInProgress?.exchangeCards || [];
    const mustKeep = actionInProgress?.mustKeep || 2;

    const handleToggleCard = (index) => {
        if (selectedIndices.includes(index)) {
            setSelectedIndices(selectedIndices.filter(i => i !== index));
        } else if (selectedIndices.length < mustKeep) {
            setSelectedIndices([...selectedIndices, index]);
        }
    };

    const handleConfirm = () => {
        if (selectedIndices.length !== mustKeep) {
            alert(`You must select exactly ${mustKeep} cards`);
            return;
        }

        socket.emit('selectCards', { gameId, playerId, selectedIndices }, (response) => {
            if (!response.success) {
                alert(response.message);
            }
        });
    };

    return (
        <div className="challenge-panel exchange-selection">
            <h3>Select {mustKeep} Cards to Keep</h3>
            <p>Selected: {selectedIndices.length}/{mustKeep}</p>
            <div className="exchange-cards">
                {cards.map((card, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleToggleCard(idx)}
                        className={`exchange-card-btn ${selectedIndices.includes(idx) ? 'selected' : ''
                            }`}
                    >
                        {card}
                    </button>
                ))}
            </div>
            <button
                onClick={handleConfirm}
                disabled={selectedIndices.length !== mustKeep}
                className="confirm-btn"
            >
                Confirm Selection
            </button>
        </div>
    );
}
