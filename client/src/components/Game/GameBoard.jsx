import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { PlayerList } from './PlayerList';
import { PlayerHand } from './PlayerHand';
import { ActionButtons } from './ActionButtons';
import { ChallengePanel } from './ChallengePanel';
import { GameLog } from './GameLog';
import { ChatBox } from './ChatBox';
import { Flourish, WaxSeal, Shield, Coin, Influence, CrownEmblem, shieldColorFor, initialsFor } from '../Common/Heraldry';
import '../../styles/game.css';
import '../../styles/theme.css';

export const GameBoard = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const socket = useGameStore(state => state.socket);
    const gameId = useGameStore(state => state.gameId);
    const playerId = useGameStore(state => state.playerId);
    const gameState = useGameStore(state => state.gameState);
    const players = useGameStore(state => state.players);
    const isHost = useGameStore(state => state.isHost);
    const winner = useGameStore(state => state.winner);
    const myPlayer = useGameStore(state => state.getMyPlayer());

    const [showStartButton, setShowStartButton] = useState(false);

    useEffect(() => {
        if (!socket || !playerId) {
            navigate('/');
        }
    }, [socket, playerId, navigate]);

    useEffect(() => {
        setShowStartButton(isHost() && gameState === 'LOBBY' && players.length >= 2);
    }, [gameState, players.length, isHost]);

    const handleStartGame = () => {
        if (!socket || !gameId) return;

        socket.emit('startGame', { gameId, playerId }, (response) => {
            if (!response.success) {
                alert(response.error);
            }
        });
    };

    if (!socket || !playerId) {
        return <div>Connecting...</div>;
    }

    if (gameState === 'LOBBY') {
        return (
            <div className="lobby-waiting">
                <h2 className="lobby-room-heading">{roomCode}</h2>
                <div className="lobby-flourish"><Flourish width={240} /></div>
                <p>Waiting for players... ({players.length}/6)</p>
                <PlayerList />
                {showStartButton && (
                    <button onClick={handleStartGame} className="start-game-btn">
                        Start Game
                    </button>
                )}
                {!isHost() && <p>Waiting for host to start the game...</p>}
                <ChatBox />
            </div>
        );
    }

    if (gameState === 'GAME_OVER') {
        const winnerPlayer = players.find(p => p.id === winner);
        const isWinner = winner === playerId;
        return (
            <div className="game-over">
                <h1>Game Over!</h1>
                <h2>{isWinner ? 'You win!' : `${winnerPlayer?.name} wins!`}</h2>
                <div className="game-over-players">
                    {players.map(p => (
                        <div key={p.id} className={`game-over-player ${p.isAlive ? 'alive' : 'eliminated'} ${p.id === winner ? 'winner' : ''}`}>
                            <span className="game-over-player-name">{p.name}</span>
                            <span className="game-over-player-status">
                                {p.id === winner ? 'Winner' : 'Eliminated'}
                            </span>
                        </div>
                    ))}
                </div>
                <button onClick={() => navigate('/')}>Back to Lobby</button>
            </div>
        );
    }

    const isEliminated = myPlayer && !myPlayer.isAlive;
    const opponents = players.filter(p => p.id !== playerId);
    const currentPlayerId = useGameStore.getState().currentPlayerId;
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    const isMyTurn = currentPlayerId === playerId;

    // Derived header values (no server fields needed):
    //   round    = number of completed actions + 1 (visible "round" counter)
    //   treasury = 50 starting coins minus what players hold
    const actionHistory = useGameStore.getState().actionHistory || [];
    const round = Math.max(1, actionHistory.length + 1);
    const heldCoins = players.reduce((s, p) => s + (p.coins || 0), 0);
    const treasury = Math.max(0, 50 - heldCoins);

    // Latest log entry — surfaced as a pill above the play surface on mobile.
    const lastEntry = actionHistory[actionHistory.length - 1];
    const lastEntryText = lastEntry
        ? `${lastEntry.player} ${lastEntry.action?.toLowerCase().replace(/_/g, ' ') || 'acted'}${lastEntry.target ? ` → ${lastEntry.target}` : ''}`
        : (currentPlayer ? `${isMyTurn ? 'Your' : `${currentPlayer.name}'s`} turn begins.` : 'Awaiting first move.');
    const lastEntryKind = lastEntry?.action === 'CHALLENGE' || lastEntry?.action === 'CHALLENGE_BLOCK'
        ? 'challenge'
        : lastEntry?.action === 'BLOCK' ? 'block' : 'neutral';

    return (
        <div className="game-board">
            {/* Desktop header — kept intact */}
            <div className="game-header">
                <h2>COUP - Room: {roomCode}</h2>
                {currentPlayer && (
                    <span className="current-turn-seal">
                        <WaxSeal size={36} label={isMyTurn ? '★' : (currentPlayer.name?.[0] || '·').toUpperCase()} />
                        {isMyTurn ? 'Your Turn' : `${currentPlayer.name}'s Turn`}
                    </span>
                )}
            </div>

            {/* Mobile header — crown · room · round · treasury · log */}
            <div className="m-game-header" aria-hidden={false}>
                <div className="m-game-header-room">
                    <span className="m-game-header-crown"><CrownEmblem size={26} /></span>
                    <div>
                        <div className="m-game-header-kicker">Room</div>
                        <div className="m-game-header-code">{roomCode}</div>
                    </div>
                </div>
                <div className="m-game-header-round">
                    <div className="m-game-header-kicker">Round</div>
                    <div className="m-game-header-roundnum">{round}</div>
                </div>
                <div className="m-game-header-treasury">
                    <Coin size={14} />
                    <div>
                        <div className="m-game-header-kicker">Treasury</div>
                        <div className="m-game-header-treasurynum">{treasury}</div>
                    </div>
                </div>
            </div>

            {isEliminated && (
                <div className="eliminated-banner">
                    <div className="eliminated-banner-content">
                        <span className="eliminated-icon">&#x1F480;</span>
                        <h2>You have been eliminated!</h2>
                        <p>You lost both influences. Spectate the rest of the game below.</p>
                        <button onClick={() => navigate('/')} className="leave-btn">
                            Leave Game
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile: rich opponent chip strip — shield · name · coins · mini cards · wax seal when current */}
            <div className="mobile-opponents">
                {opponents.map(p => {
                    const isCur = p.id === currentPlayerId;
                    return (
                        <div
                            key={p.id}
                            className={`mobile-opponent ${!p.isAlive ? 'eliminated' : ''} ${isCur ? 'active' : ''}`}
                        >
                            {isCur && (
                                <span className="mobile-opponent-seal" aria-hidden>
                                    <WaxSeal size={22} label="" />
                                </span>
                            )}
                            <div className="mobile-opponent-top">
                                <Shield color={shieldColorFor(p.id || p.name)} initials={initialsFor(p.name)} size={28} />
                                <div className="mobile-opponent-meta">
                                    <span className="mobile-opponent-name">{p.name}</span>
                                    <span className="mobile-opponent-coins">
                                        <Coin size={11} /> {p.coins}
                                    </span>
                                </div>
                            </div>
                            <div className="mobile-opponent-cards">
                                {Array.from({ length: 2 }).map((_, i) => {
                                    const card = p.cards?.[i];
                                    const revealed = card?.revealed;
                                    return (
                                        <span key={i} className={`mobile-mini-card ${revealed ? 'revealed' : ''}`}>
                                            {revealed ? card.type : ''}
                                        </span>
                                    );
                                })}
                            </div>
                            {!p.isConnected && <span className="mobile-dc">DC</span>}
                        </div>
                    );
                })}
            </div>

            {/* Mobile: latest-action pill */}
            <div className={`m-latest m-latest-${lastEntryKind}`}>
                <span className="m-latest-label">Latest</span>
                <span className="m-latest-text">{lastEntryText}</span>
            </div>

            <div className="game-content">
                <div className="left-panel">
                    <PlayerList />
                    <GameLog />
                </div>

                <div className="main-panel">
                    <ChallengePanel />
                    <GameLog className="mobile-game-log" />
                    {!isEliminated && <PlayerHand />}
                    <ActionButtons />
                </div>
            </div>

            {/* Mobile: fixed bottom dock — your seat strip + hand + actions */}
            <div className="mobile-bottom-bar">
                {myPlayer && (
                    <div className={`m-seat-strip ${isMyTurn ? 'active' : ''}`}>
                        <Shield color={shieldColorFor(playerId || myPlayer.name)} initials={initialsFor(myPlayer.name)} size={32} />
                        <div className="m-seat-meta">
                            <span className="m-seat-name">
                                {myPlayer.name}
                                <span className="m-seat-you"> (You)</span>
                            </span>
                            <span className="m-seat-stats">
                                <span className="m-seat-coins"><Coin size={13} /> {myPlayer.coins}</span>
                                <span className="m-seat-influence">
                                    {Array.from({ length: myPlayer.influence }).map((_, i) => (
                                        <Influence key={`a${i}`} alive size={13} />
                                    ))}
                                    {Array.from({ length: 2 - myPlayer.influence }).map((_, i) => (
                                        <Influence key={`d${i}`} alive={false} size={13} />
                                    ))}
                                </span>
                            </span>
                        </div>
                        {isMyTurn && <span className="m-seat-seal" aria-hidden><WaxSeal size={28} label="★" /></span>}
                    </div>
                )}
                {!isEliminated && <PlayerHand />}
                <ActionButtons />
            </div>

            <ChatBox />
        </div>
    );
};
