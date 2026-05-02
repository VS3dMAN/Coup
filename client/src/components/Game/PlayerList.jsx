import { useGameStore } from '../../store/gameStore';
import { Shield, Coin, Influence, Flourish, shieldColorFor, initialsFor } from '../Common/Heraldry';

export const PlayerList = () => {
    const players = useGameStore(state => state.players);
    const currentPlayerId = useGameStore(state => state.currentPlayerId);
    const playerId = useGameStore(state => state.playerId);

    return (
        <div className="player-list">
            <h3>Players</h3>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 12px' }}>
                <Flourish width={180} />
            </div>
            {players.map(player => (
                <div
                    key={player.id}
                    className={`player-item ${player.id === currentPlayerId ? 'active' : ''
                        } ${!player.isAlive ? 'eliminated' : ''} ${player.id === playerId ? 'you' : ''
                        }`}
                >
                    <Shield color={shieldColorFor(player.id || player.name)} initials={initialsFor(player.name)} size={36} />
                    <div className="player-info">
                        <span className="player-name">
                            {player.name}
                            {player.id === playerId && ' (You)'}
                            {player.id === currentPlayerId && ' ▶'}
                        </span>
                        {!player.isConnected && <span className="disconnected"> [DC]</span>}
                        <div className="player-stats">
                            <span className="coins"><Coin size={14} /> {player.coins}</span>
                            <span className="influence">
                                {Array.from({ length: player.influence }).map((_, i) => (
                                    <Influence key={`a${i}`} alive size={14} />
                                ))}
                                {Array.from({ length: 2 - player.influence }).map((_, i) => (
                                    <Influence key={`d${i}`} alive={false} size={14} />
                                ))}
                            </span>
                        </div>
                    </div>
                    {player.cards && (
                        <div className="player-cards">
                            {player.cards.map((card, idx) => (
                                <span key={idx} className="card-mini">
                                    {card.revealed ? card.type : '◆'}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
