import { useGameStore } from '../../store/gameStore';

export const PlayerList = () => {
    const players = useGameStore(state => state.players);
    const currentPlayerId = useGameStore(state => state.currentPlayerId);
    const playerId = useGameStore(state => state.playerId);

    return (
        <div className="player-list">
            <h3>Players</h3>
            {players.map(player => (
                <div
                    key={player.id}
                    className={`player-item ${player.id === currentPlayerId ? 'active' : ''
                        } ${!player.isAlive ? 'eliminated' : ''} ${player.id === playerId ? 'you' : ''
                        }`}
                >
                    <div className="player-info">
                        <span className="player-name">
                            {player.name}
                            {player.id === playerId && ' (You)'}
                            {player.id === currentPlayerId && ' ▶'}
                        </span>
                        {!player.isConnected && <span className="disconnected"> [DC]</span>}
                    </div>
                    <div className="player-stats">
                        <span className="coins">💰 {player.coins}</span>
                        <span className="influence">
                            {'❤️'.repeat(player.influence)}
                            {'💔'.repeat(2 - player.influence)}
                        </span>
                    </div>
                    {player.cards && (
                        <div className="player-cards">
                            {player.cards.map((card, idx) => (
                                <span key={idx} className="card-mini">
                                    {card.revealed ? `🎴 ${card.type}` : '🎴'}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
