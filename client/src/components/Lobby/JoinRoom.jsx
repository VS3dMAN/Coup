import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';

export const JoinRoom = () => {
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const socket = useGameStore(state => state.socket);
    const setPlayerInfo = useGameStore(state => state.setPlayerInfo);
    const setRoomInfo = useGameStore(state => state.setRoomInfo);
    const navigate = useNavigate();

    const handleJoin = (e) => {
        e.preventDefault();

        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!roomCode.trim() || roomCode.length !== 4) {
            setError('Please enter a valid 4-character room code');
            return;
        }

        if (!socket) {
            setError('Not connected to server');
            return;
        }

        socket.emit('joinRoom', {
            playerName: playerName.trim(),
            roomCode: roomCode.toUpperCase()
        }, (response) => {
            if (response.success) {
                setPlayerInfo(response.playerId, playerName.trim());
                setRoomInfo(roomCode.toUpperCase(), response.gameId);
                navigate(`/game/${roomCode.toUpperCase()}`);
            } else {
                setError(response.error || 'Failed to join room');
            }
        });
    };

    return (
        <div className="join-room">
            <h2>Join Room</h2>
            <form onSubmit={handleJoin}>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                />
                <input
                    type="text"
                    placeholder="Room Code (e.g., ABCD)"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={4}
                />
                {error && <p className="error">{error}</p>}
                <button type="submit">Join Room</button>
            </form>
        </div>
    );
};
