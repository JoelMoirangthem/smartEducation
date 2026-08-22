import { io } from 'socket.io-client';

let socket = null;
let pendingAuth = null;
let connectHandler = null;

export const initializeSocket = (userId, classId, role) => {
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const SOCKET_URL = BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/api$/, '');

    // Store latest auth data
    pendingAuth = { userId, classId, role };

    const token = localStorage.getItem('token');

    // If a previous session's token is cached in the singleton handshake,
    // tear it down so the new identity is used for auth (prevents cross-user
    // event leakage after logout → login without a page reload)
    if (socket && socket.auth?.token !== token) {
        disconnectSocket();
    }

    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
            transports: ['websocket', 'polling'],
            auth: { token }
        });

        // Single connect handler — uses latest pendingAuth
        connectHandler = () => {
            console.log('🔗 WebSocket Connected:', socket?.id);
            if (pendingAuth && socket) {
                socket.emit('authenticate', pendingAuth);
                console.log(`🔐 Authenticating: ${pendingAuth.role}`);
            }
        };
        socket.on('connect', connectHandler);

        socket.on('disconnect', () => console.log('❌ WebSocket Disconnected'));
        socket.on('connect_error', (error) => {
            console.error('⚠️ Connection Error:', error.message);
            if (error.message?.includes('Authentication required') || error.message?.includes('Invalid token')) {
                localStorage.removeItem('token');
                socket.disconnect();
                socket = null;
                connectHandler = null;
            }
        });
    } else if (socket.connected && pendingAuth) {
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