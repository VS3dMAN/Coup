import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useGameStore } from './store/gameStore';
import { CreateRoom } from './components/Lobby/CreateRoom';
import { JoinRoom } from './components/Lobby/JoinRoom';
import { GameBoard } from './components/Game/GameBoard';
import './styles/global.css';

function App() {
    const setSocket = useGameStore(state => state.setSocket);
    const updateGameState = useGameStore(state => state.updateGameState);

    useEffect(() => {
        const socket = io(import.meta.env.VITE_API_URL || undefined);

        socket.on('connect', () => {
            console.log('Connected to server');
            setSocket(socket);
        });

        socket.on('gameStateUpdate', (gameState) => {
            console.log('Game state updated:', gameState);
            updateGameState(gameState);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        return () => {
            socket.close();
        };
    }, []);

    return (
        <BrowserRouter>
            <div className="app">
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/game/:roomCode" element={<GameBoard />} />
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
