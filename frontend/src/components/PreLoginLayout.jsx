import { Outlet } from 'react-router-dom';

/**
 * PreLoginLayout - A layout wrapper for public authentication pages.
 */
const PreLoginLayout = () => {
    return (
        <div style={{ position: 'relative', minHeight: '100vh', width: '100%', background: 'var(--c-bg)' }}>
            {/* The content container */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <Outlet />
            </div>
        </div>
    );
};

export default PreLoginLayout;
