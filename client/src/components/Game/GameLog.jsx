import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

export const GameLog = () => {
    const actionHistory = useGameStore(state => state.actionHistory);
    const logRef = useRef(null);

    useEffect(() => {
        // Auto-scroll to bottom when new actions are added
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [actionHistory]);

    return (
        <div className="game-log">
            <h3>Game Log</h3>
            <div className="log-content" ref={logRef}>
                {actionHistory.length === 0 ? (
                    <p className="log-empty">Game starting...</p>
                ) : (
                    actionHistory.map((entry, idx) => (
                        <div key={idx} className={`log-entry ${entry.result}`}>
                            <span className="log-player">{entry.player}</span>
                            <span className="log-action">{entry.action}</span>
                            {entry.target && <span className="log-target">→ {entry.target}</span>}
                            <span className="log-result">{entry.details}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
