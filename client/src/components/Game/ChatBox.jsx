import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

export const ChatBox = () => {
    const socket = useGameStore(state => state.socket);
    const playerId = useGameStore(state => state.playerId);
    const playerName = useGameStore(state => state.playerName);
    const roomCode = useGameStore(state => state.roomCode);
    const chatMessages = useGameStore(state => state.chatMessages);

    const [message, setMessage] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
        if (!isOpen && chatMessages.length > 0) {
            setUnreadCount(prev => prev + 1);
        }
    }, [chatMessages.length]);

    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!socket || !message.trim() || !roomCode) return;

        socket.emit('sendChatMessage', {
            roomCode,
            playerId,
            playerName,
            message: message.trim()
        });

        setMessage('');
    };

    return (
        <div className={`chat-box ${isOpen ? 'open' : 'closed'}`}>
            <button
                className="chat-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                Chat {unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="chat-content">
                    <div className="chat-messages">
                        {chatMessages.length === 0 ? (
                            <p className="chat-empty">No messages yet...</p>
                        ) : (
                            chatMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`chat-message ${msg.isSystem ? 'system' : ''} ${msg.playerId === playerId ? 'own' : ''}`}
                                >
                                    {msg.isSystem ? (
                                        <span className="chat-system-text">{msg.message}</span>
                                    ) : (
                                        <>
                                            <span className="chat-sender">
                                                {msg.playerId === playerId ? 'You' : msg.playerName}:
                                            </span>
                                            <span className="chat-text">{msg.message}</span>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSend} className="chat-input-form">
                        <input
                            ref={inputRef}
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type a message..."
                            maxLength={500}
                            className="chat-input"
                        />
                        <button type="submit" className="chat-send-btn" disabled={!message.trim()}>
                            Send
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
