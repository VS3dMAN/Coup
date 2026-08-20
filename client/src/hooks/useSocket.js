/**
 * Socket.io Hook
 * Custom hook to manage WebSocket connection to the game server
 */

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || undefined;

export const useSocket = () => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Create socket connection
        // The backend is on Render's free plan, which spins down after inactivity.
        // A cold start can take ~50s+, so give each attempt room to outlast it and
        // never stop retrying - otherwise the client gives up permanently and the
        // user is stuck on "not connected" until they reload the page.
        const newSocket = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            reconnectionAttempts: Infinity,
            timeout: 60000
        });

        // Connection event handlers
        newSocket.on('connect', () => {
            console.log('✅ Connected to server:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from server:', reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setIsConnected(false);
        });

        setSocket(newSocket);

        // Cleanup on unmount
        return () => {
            console.log('🔌 Closing socket connection');
            newSocket.close();
        };
    }, []);

    return { socket, isConnected };
};
