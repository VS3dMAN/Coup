import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { PlayerList } from './PlayerList';
import { PlayerHand } from './PlayerHand';
import { ActionButtons } from './ActionButtons';
import { ChallengePanel } from './ChallengePanel';
import { GameLog } from './GameLog';
import '../../styles/game.css';

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

    const [showStartButton, setShowStartButton] = useState(false);

    useEffect(() => {
        if (!socket || !playerId) {
            navigate('/');
        }
    }, [socket, playerId, navigate]);

    useEffect(() => {
        // Show start button for host in lobby
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
                <h2>Room: {roomCode}</h2>
                <p>Waiting for players... ({players.length}/6)</p>
                <PlayerList />
                {showStartButton && (
                    <button onClick={handleStartGame} className="start-game-btn">
                        Start Game
                    </button>
                )}
                {!isHost() && <p>Waiting for host to start the game...</p>}
            </div>
        );
    }

    if (gameState === 'GAME_OVER') {
        const winnerPlayer = players.find(p => p.id === winner);
        return (
            <div className="game-over">
                <h1>Game Over!</h1>
                <h2>{winnerPlayer?.name} wins!</h2>
                <button onClick={() => navigate('/')}>Back to Lobby</button>
            </div>
        );
    }

    return (
        <div className="game-board">
            <div className="game-header">
                <h2>COUP - Room: {roomCode}</h2>
            </div>

            <div className="game-content">
                <div className="left-panel">
                    <PlayerList />
                    <GameLog />
                </div>

                <div className="main-panel">
                    <PlayerHand />
                    <ChallengePanel />
                    <ActionButtons />
                </div>
            </div>
        </div>
    );
};
