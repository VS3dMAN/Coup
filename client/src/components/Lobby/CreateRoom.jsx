import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';

export const CreateRoom = () => {
    const [playerName, setPlayerName] = useState('');
    const [error, setError] = useState('');
    const socket = useGameStore(state => state.socket);
    const setPlayerInfo = useGameStore(state => state.setPlayerInfo);
    const setRoomInfo = useGameStore(state => state.setRoomInfo);
    const navigate = useNavigate();

    const handleCreate = (e) => {
        e.preventDefault();

        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!socket) {
            setError('Not connected to server');
            return;
        }

        socket.emit('createRoom', { playerName: playerName.trim() }, (response) => {
            if (response.success) {
                setPlayerInfo(response.playerId, playerName.trim());
                setRoomInfo(response.roomCode, response.gameId);
                useGameStore.getState().saveSession();
                navigate(`/game/${response.roomCode}`);
            } else {
                setError(response.error || 'Failed to create room');
            }
        });
    };

    return (
        <div className="create-room">
            <h2>Create Room</h2>
            <form onSubmit={handleCreate}>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                />
                {error && <p className="error">{error}</p>}
                <button type="submit">Create Room</button>
            </form>
        </div>
    );
};
