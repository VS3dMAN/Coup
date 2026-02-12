import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ACTIONS } from '../../utils/constants';

export const ActionButtons = () => {
    const socket = useGameStore(state => state.socket);
    const gameId = useGameStore(state => state.gameId);
    const playerId = useGameStore(state => state.playerId);
    const isMyTurn = useGameStore(state => state.isMyTurn);
    const canTakeAction = useGameStore(state => state.canTakeAction);
    const myPlayer = useGameStore(state => state.getMyPlayer());
    const players = useGameStore(state => state.players);
    const gameState = useGameStore(state => state.gameState);
    const actionInProgress = useGameStore(state => state.actionInProgress);

    const [selectedAction, setSelectedAction] = useState(null);
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [error, setError] = useState('');

    if (!isMyTurn() || gameState !== 'ACTIVE_TURN') {
        return null;
    }

    const mustCoup = myPlayer && myPlayer.coins >= 10;

    const handleActionClick = (action) => {
        setError('');

        // Actions that need a target
        if ([ACTIONS.COUP, ACTIONS.ASSASSINATE, ACTIONS.STEAL].includes(action)) {
            setSelectedAction(action);
            setSelectedTarget(null);
        } else {
            // Actions without target
            takeAction(action, null);
        }
    };

    const handleTargetSelect = (targetId) => {
        setSelectedTarget(targetId);
    };

    const handleConfirmAction = () => {
        if (!selectedTarget) {
            setError('Please select a target');
            return;
        }
        takeAction(selectedAction, selectedTarget);
    };

    const handleCancelTarget = () => {
        setSelectedAction(null);
        setSelectedTarget(null);
        setError('');
    };

    const takeAction = (action, targetPlayerId) => {
        if (!socket || !gameId) return;

        socket.emit('takeAction', {
            gameId,
            playerId,
            action,
            targetPlayerId
        }, (response) => {
            if (response.success) {
                setSelectedAction(null);
                setSelectedTarget(null);
                setError('');
            } else {
                setError(response.error || 'Action failed');
            }
        });
    };

    // If selecting target, show target selection UI
    if (selectedAction) {
        const validTargets = players.filter(p =>
            p.isAlive && p.id !== playerId
        );

        return (
            <div className="action-buttons target-selection">
                <h3>Select Target for {selectedAction}</h3>
                <div className="target-list">
                    {validTargets.map(player => (
                        <button
                            key={player.id}
                            onClick={() => handleTargetSelect(player.id)}
                            className={`target-btn ${selectedTarget === player.id ? 'selected' : ''}`}
                        >
                            {player.name} (💰{player.coins} ❤️{player.influence})
                        </button>
                    ))}
                </div>
                {error && <p className="error">{error}</p>}
                <div className="target-actions">
                    <button onClick={handleConfirmAction} disabled={!selectedTarget}>
                        Confirm
                    </button>
                    <button onClick={handleCancelTarget}>Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div className="action-buttons">
            <h3>Your Turn - Choose Action</h3>
            {mustCoup && <p className="must-coup">⚠️ You have 10+ coins and must COUP!</p>}
            {error && <p className="error">{error}</p>}

            <div className="actions-grid">
                {/* Basic Actions */}
                <button
                    onClick={() => handleActionClick(ACTIONS.INCOME)}
                    disabled={!canTakeAction(ACTIONS.INCOME) || mustCoup}
                    className="action-btn income"
                >
                    <span className="action-name">Income</span>
                    <span className="action-desc">+1 coin</span>
                </button>

                <button
                    onClick={() => handleActionClick(ACTIONS.FOREIGN_AID)}
                    disabled={!canTakeAction(ACTIONS.FOREIGN_AID) || mustCoup}
                    className="action-btn foreign-aid"
                >
                    <span className="action-name">Foreign Aid</span>
                    <span className="action-desc">+2 coins (blockable)</span>
                </button>

                <button
                    onClick={() => handleActionClick(ACTIONS.COUP)}
                    disabled={!canTakeAction(ACTIONS.COUP)}
                    className={`action-btn coup ${mustCoup ? 'required' : ''}`}
                >
                    <span className="action-name">Coup</span>
                    <span className="action-desc">-7 coins, kill target</span>
                </button>

                {/* Character Actions */}
                <button
                    onClick={() => handleActionClick(ACTIONS.TAX)}
                    disabled={!canTakeAction(ACTIONS.TAX) || mustCoup}
                    className="action-btn tax"
                    title="Claim Duke"
                >
                    <span className="action-name">Tax</span>
                    <span className="action-desc">+3 coins (Duke)</span>
                </button>

                <button
                    onClick={() => handleActionClick(ACTIONS.ASSASSINATE)}
                    disabled={!canTakeAction(ACTIONS.ASSASSINATE) || mustCoup}
                    className="action-btn assassinate"
                    title="Claim Assassin"
                >
                    <span className="action-name">Assassinate</span>
                    <span className="action-desc">-3 coins, kill (Assassin)</span>
                </button>

                <button
                    onClick={() => handleActionClick(ACTIONS.STEAL)}
                    disabled={!canTakeAction(ACTIONS.STEAL) || mustCoup}
                    className="action-btn steal"
                    title="Claim Captain"
                >
                    <span className="action-name">Steal</span>
                    <span className="action-desc">+2 coins from target (Captain)</span>
                </button>

                <button
                    onClick={() => handleActionClick(ACTIONS.EXCHANGE)}
                    disabled={!canTakeAction(ACTIONS.EXCHANGE) || mustCoup}
                    className="action-btn exchange"
                    title="Claim Ambassador"
                >
                    <span className="action-name">Exchange</span>
                    <span className="action-desc">Swap cards (Ambassador)</span>
                </button>
            </div>
        </div>
    );
};
