import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Flourish } from '../Common/Heraldry';

const ACTION_CONFIG = {
    INCOME: { verb: 'took Income', category: 'positive' },
    FOREIGN_AID: { verb: 'took Foreign Aid', category: 'positive' },
    COUP: { verb: 'launched a Coup on', category: 'hostile' },
    TAX: { verb: 'claimed Tax (Duke)', category: 'positive' },
    ASSASSINATE: { verb: 'attempted to Assassinate', category: 'hostile' },
    STEAL: { verb: 'attempted to Steal from', category: 'hostile' },
    EXCHANGE: { verb: 'used Exchange (Ambassador)', category: 'positive' },
    CHALLENGE: { verb: 'challenged', category: 'warning' },
    BLOCK: { verb: 'blocked', category: 'warning' },
    CHALLENGE_BLOCK: { verb: 'challenged the block by', category: 'warning' },
};

function getLogCategory(entry) {
    const config = ACTION_CONFIG[entry.action];
    if (!config) return '';

    // Override category based on result
    if (entry.result === 'failed') return 'hostile';
    if (entry.result === 'blocked') return 'warning';
    if (entry.result === 'success' && config.category === 'hostile') return 'hostile';
    return config.category;
}

function formatLogEntry(entry) {
    const config = ACTION_CONFIG[entry.action] || { verb: entry.action };
    const verb = config.verb;
    const cleanVerb = !entry.target ? verb.replace(/ (on|from)$/, '') : verb;

    return { player: entry.player, verb: cleanVerb, target: entry.target, details: entry.details, result: entry.result };
}

export const GameLog = () => {
    const actionHistory = useGameStore(state => state.actionHistory);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [actionHistory]);

    return (
        <div className="game-log">
            <h3>Game Log</h3>
            <div className="log-flourish"><Flourish width={180} /></div>
            <div className="log-content">
                {actionHistory.length === 0 ? (
                    <p className="log-empty">Game starting...</p>
                ) : (
                    actionHistory.map((entry, idx) => {
                        const formatted = formatLogEntry(entry);
                        const category = getLogCategory(entry);
                        return (
                            <div key={idx} className={`log-entry log-${category} ${entry.result || ''}`}>
                                <span className="log-player">{formatted.player}</span>
                                <span className="log-action"> {formatted.verb}</span>
                                {formatted.target && (
                                    <span className="log-target"> {formatted.target}</span>
                                )}
                                {formatted.details && (
                                    <span className="log-details"> — {formatted.details}</span>
                                )}
                                {formatted.result && (
                                    <span className={`log-result log-result-${formatted.result}`}>
                                        {' '}[{formatted.result}]
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
