import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket.service';

/**
 * Subscribe to a Socket.IO event on the shared singleton connection.
 *
 * The handler is kept in a ref so the component always executes the
 * latest closure — no stale-state bugs, no resubscribing on every
 * render. The subscription itself only changes when `event` changes.
 *
 * Call `initializeSocket()` (as pages already do) before this hook's
 * first effect runs; it degrades gracefully to a no-op when no socket
 * exists yet.
 */
export default function useSocketEvent(event, handler) {
    const savedHandler = useRef(handler);

    useEffect(() => {
        savedHandler.current = handler;
    }, [handler]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return undefined;
        const listener = (...args) => savedHandler.current(...args);
        socket.on(event, listener);
        return () => socket.off(event, listener);
    }, [event]);
}
