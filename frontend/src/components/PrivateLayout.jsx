import React, { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
const Scene3D = lazy(() => import('./Scene3D'));

/**
 * PrivateLayout - 3D background is lazy and below-the-fold to avoid blocking landing FCP/LCP.
 * Only loads when a protected route is actually visited.
 */
const PrivateLayout = () => {
    return (
        <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
            <Suspense fallback={null}>
                <Scene3D />
            </Suspense>
            <div style={{ position: 'relative', zIndex: 1 }}>
                <Outlet />
            </div>
        </div>
    );
};

export default PrivateLayout;
