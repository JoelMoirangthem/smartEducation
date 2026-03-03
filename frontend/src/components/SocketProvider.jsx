import React from 'react';
import useSocketNotifications from '../hooks/useSocketNotifications.jsx';

// Wrapper component that initializes socket notifications for protected routes
const SocketProvider = ({ children }) => {
    useSocketNotifications();
    return <>{children}</>;
};

export default SocketProvider;
