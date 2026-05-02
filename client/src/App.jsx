import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useGameStore } from './store/gameStore';
import { useSocket } from './hooks/useSocket';
import { CreateRoom } from './components/Lobby/CreateRoom';
import { JoinRoom } from './components/Lobby/JoinRoom';
import { GameBoard } from './components/Game/GameBoard';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { Flourish } from './components/Common/Heraldry';
import './styles/global.css';
import './styles/theme.css';

function App() {
    const { socket } = useSocket();
    const setSocket = useGameStore(state => state.setSocket);
    const updateGameState = useGameStore(state => state.updateGameState);

    useEffect(() => {
        if (!socket) return;

        socket.on('connect', () => {
            console.log('Connected to server');
            setSocket(socket);

            // Attempt to reclaim session on reconnect
            const raw = localStorage.getItem('coup_session');
            if (raw) {
                try {
                    const session = JSON.parse(raw);
                    // Try dedicated reconnect first, fall back to rejoin
                    socket.emit('reconnect_attempt', { gameId: session.gameId, playerId: session.playerId }, (res) => {
                        if (res.success) {
                            useGameStore.getState().setPlayerInfo(res.playerId, res.playerName);
                            useGameStore.getState().setRoomInfo(res.roomCode, res.gameId);
                            console.log('Reconnected to room:', res.roomCode);
                        } else {
                            // Fall back to legacy rejoin
                            socket.emit('rejoinRoom', { gameId: session.gameId, playerId: session.playerId }, (res2) => {
                                if (res2.success) {
                                    useGameStore.getState().setPlayerInfo(session.playerId, session.playerName);
                                    useGameStore.getState().setRoomInfo(session.roomCode, session.gameId);
                                    console.log('Rejoined room:', session.roomCode);
                                } else {
                                    console.log('Could not rejoin:', res2.error);
                                    useGameStore.getState().clearSession();
                                }
                            });
                        }
                    });
                } catch {
                    useGameStore.getState().clearSession();
                }
            }
        });

        socket.on('gameStateUpdate', (gameState) => {
            try {
                updateGameState(gameState);
            } catch (err) {
                console.error('gameStateUpdate handler error:', err);
            }
        });

        socket.on('chatMessage', (message) => {
            useGameStore.getState().addChatMessage(message);
        });

        socket.on('playerReconnected', ({ playerName }) => {
            useGameStore.getState().addChatMessage({
                playerId: 'system',
                playerName: 'System',
                message: `${playerName} has reconnected.`,
                timestamp: Date.now(),
                isSystem: true
            });
        });

        socket.on('playerDisconnected', ({ playerName }) => {
            useGameStore.getState().addChatMessage({
                playerId: 'system',
                playerName: 'System',
                message: `${playerName} has disconnected.`,
                timestamp: Date.now(),
                isSystem: true
            });
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        return () => {
            socket.off('connect');
            socket.off('gameStateUpdate');
            socket.off('chatMessage');
            socket.off('playerReconnected');
            socket.off('playerDisconnected');
            socket.off('disconnect');
        };
    }, [socket]);

    return (
        <BrowserRouter>
            <div className="app">
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/game/:roomCode" element={<ErrorBoundary><GameBoard /></ErrorBoundary>} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

function LandingPage() {
    return (
        <div className="landing-page">
            <div className="kingdom-kicker">Online Multiplayer Card Game</div>
            <h1>COUP - Online</h1>
            <div className="kingdom-flourish"><Flourish width={280} /></div>
            <div className="lobby-options">
                <CreateRoom />
                <div className="divider">OR</div>
                <JoinRoom />
            </div>
        </div>
    );
}

export default App;
