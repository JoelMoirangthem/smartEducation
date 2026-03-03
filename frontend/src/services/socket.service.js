import { io } from 'socket.io-client';

let socket = null;
let pendingAuth = null;

export const initializeSocket = (userId, classId, role) => {
    const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

    // Store latest auth data
    pendingAuth = { userId, classId, role };

    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
            transports: ['websocket', 'polling'] // Try websocket first for performance
        });

        socket.on('connect', () => {
            console.log('🔗 WebSocket Connected:', socket.id);
            if (pendingAuth) {
                socket.emit('authenticate', pendingAuth);
                console.log(`🔐 Authenticating: ${pendingAuth.role}`);
            }
        });

        socket.on('disconnect', () => console.log('❌ WebSocket Disconnected'));
        socket.on('connect_error', (error) => console.error('⚠️ Connection Error:', error));
    } else if (socket.connected) {
        // If already connected and data changed, re-authenticate immediately
        socket.emit('authenticate', pendingAuth);
        console.log(`🔄 Re-authenticating: ${pendingAuth.role}`);
    }

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        pendingAuth = null;
    }
};

export default { initializeSocket, getSocket, disconnectSocket };
