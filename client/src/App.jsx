import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useGameStore } from './store/gameStore';
import { useSocket } from './hooks/useSocket';
import { CreateRoom } from './components/Lobby/CreateRoom';
import { JoinRoom } from './components/Lobby/JoinRoom';
import { GameBoard } from './components/Game/GameBoard';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import './styles/global.css';

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
                    socket.emit('rejoinRoom', { gameId: session.gameId, playerId: session.playerId }, (res) => {
                        if (res.success) {
                            useGameStore.getState().setPlayerInfo(session.playerId, session.playerName);
                            useGameStore.getState().setRoomInfo(session.roomCode, session.gameId);
                            console.log('Rejoined room:', session.roomCode);
                        } else {
                            console.log('Could not rejoin:', res.error);
                            useGameStore.getState().clearSession();
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

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        return () => {
            socket.off('connect');
            socket.off('gameStateUpdate');
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
            <h1>COUP - Online</h1>
            <div className="lobby-options">
                <CreateRoom />
                <div className="divider">OR</div>
                <JoinRoom />
            </div>
        </div>
    );
}

export default App;
