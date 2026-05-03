import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Flourish } from '../Common/Heraldry';

// Timer indicator. Renders both a digit pill (.timer, shown on desktop)
// and a circular SVG dial (.timer-dial, shown on mobile via CSS).
// One source of truth for the value; CSS swaps which is visible.
const TimerDisplay = ({ seconds, total = 30 }) => {
    const urgent = seconds <= 10;
    const size = 52;
    const r = size / 2 - 4;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, total > 0 ? seconds / total : 0));
    return (
        <>
            <span className={urgent ? 'timer timer-urgent' : 'timer'}>{seconds}s</span>
            <span className={`timer-dial ${urgent ? 'timer-urgent' : ''}`} aria-hidden>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={size / 2} cy={size / 2} r={r} fill="var(--c-navyDeep)" stroke="var(--c-gold)" strokeWidth="1.5" />
                    <circle
                        cx={size / 2} cy={size / 2} r={r}
                        fill="none" stroke="var(--c-goldBright)" strokeWidth="3"
                        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        strokeLinecap="round"
                    />
                    <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="700" fontSize={size * 0.32} fill="var(--c-goldBright)">{seconds}</text>
                </svg>
            </span>
        </>
    );
};

export const ChallengePanel = () => {
    const socket = useGameStore(state => state.socket);
    const gameId = useGameStore(state => state.gameId);
    const playerId = useGameStore(state => state.playerId);
    const gameState = useGameStore(state => state.gameState);
    const actionInProgress = useGameStore(state => state.actionInProgress);
    const players = useGameStore(state => state.players);
    const myPlayer = useGameStore(state => state.getMyPlayer());

    const [timer, setTimer] = useState(0);
    const [selectedBlock, setSelectedBlock] = useState(null);

    const decisionDeadline = actionInProgress?.decisionDeadline;

    useEffect(() => {
        if (
            !decisionDeadline ||
            !['WAITING_CHALLENGE', 'WAITING_BLOCK', 'WAITING_BLOCK_CHALLENGE'].includes(gameState)
        ) {
            setTimer(0);
            return;
        }

        const tick = () => {
            const remaining = Math.max(0, Math.ceil((decisionDeadline - Date.now()) / 1000));
            setTimer(remaining);
            return remaining;
        };

        if (tick() === 0) return;
        const interval = setInterval(() => {
            if (tick() === 0) clearInterval(interval);
        }, 250);
        return () => clearInterval(interval);
    }, [gameState, decisionDeadline]);

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
                    <TimerDisplay seconds={timer} />
                </div>
                <div className="panel-flourish"><Flourish width={240} color="var(--c-accent)" /></div>
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
        const isTargetOnlyBlock =
            actionInProgress.type === 'ASSASSINATE' || actionInProgress.type === 'STEAL';
        const canIBlock = isTargetOnlyBlock
            ? playerId === actionInProgress.targetPlayer
            : playerId !== actionInProgress.actingPlayer;

        if (!canBlock || !canIBlock) return null;

        return (
            <div className="challenge-panel block-variant">
                <div className="panel-header">
                    <h3>Block Window</h3>
                    <TimerDisplay seconds={timer} />
                </div>
                <div className="panel-flourish"><Flourish width={240} color="var(--c-navy)" /></div>
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
                    <TimerDisplay seconds={timer} />
                </div>
                <div className="panel-flourish"><Flourish width={240} color="var(--c-accent)" /></div>
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
                <div className="panel-flourish"><Flourish width={240} color="var(--c-gold)" /></div>
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
