import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

const ACTION_VERBS = {
    INCOME: 'took Income',
    FOREIGN_AID: 'took Foreign Aid',
    COUP: 'launched a Coup on',
    TAX: 'claimed Tax (Duke) on',
    ASSASSINATE: 'attempted to Assassinate',
    STEAL: 'attempted to Steal from',
    EXCHANGE: 'used Exchange (Ambassador)',
    CHALLENGE: 'challenged',
    BLOCK: 'blocked',
    CHALLENGE_BLOCK: 'challenged the block by',
};

function formatLogEntry(entry) {
    const verb = ACTION_VERBS[entry.action] || entry.action;
    // For untargeted actions, drop the trailing 'on' / 'from'
    const cleanVerb = !entry.target
        ? verb.replace(/ (on|from)$/, '')
        : verb;
    let text = `${entry.player} ${cleanVerb}`;
    if (entry.target) text += ` ${entry.target}`;
    if (entry.details) text += ` — ${entry.details}`;
    return text;
}

export const GameLog = () => {
    const actionHistory = useGameStore(state => state.actionHistory);
    const logRef = useRef(null);

    useEffect(() => {
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
                            {formatLogEntry(entry)}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
