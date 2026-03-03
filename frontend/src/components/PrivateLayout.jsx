import React from 'react';
import { Outlet } from 'react-router-dom';
import Scene3D from './Scene3D';

/**
 * PrivateLayout - A layout wrapper for protected routes.
 * It includes the original 3D background (Scene3D).
 */
const PrivateLayout = () => {
    return (
        <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
            {/* The original 3D background used for dashboards */}
            <Scene3D />

            {/* The main content area */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <Outlet />
            </div>
        </div>
    );
};

export default PrivateLayout;
