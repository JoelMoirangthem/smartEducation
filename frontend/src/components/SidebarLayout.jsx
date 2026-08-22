import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import {
    LayoutDashboard, CheckSquare, BookOpen, GraduationCap, Bell,
    MessageSquare, User, LogOut, Menu, X, Library,
    Users, ScanFace, ChevronRight
} from 'lucide-react';
import Notifications from './Notifications';
import useSocketNotifications from '../hooks/useSocketNotifications.jsx';
import { getSocket, disconnectSocket } from '../services/socket.service';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const SIDEBAR_W = 240;

const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'], color: '#6366f1' },
    { path: '/admin/academic', label: 'Academic', icon: Library, roles: ['admin'], color: '#06b6d4' },
    { path: '/admin/users', label: 'Users', icon: Users, roles: ['admin'], color: '#a78bfa' },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['teacher', 'student'], color: '#6366f1' },
    { path: '/attendance', label: 'Attendance', icon: CheckSquare, roles: ['teacher', 'student'], color: '#34d399' },
    { path: '/face-register', label: 'Register Face', icon: ScanFace, roles: ['student'], color: '#f472b6' },
    { path: '/face-attendance', label: 'Face Attendance', icon: ScanFace, roles: ['teacher'], color: '#f472b6' },
    { path: '/marks', label: 'Marks', icon: GraduationCap, roles: ['teacher', 'student'], color: '#fbbf24' },
    { path: '/notes', label: 'Notes', icon: BookOpen, roles: ['teacher', 'student'], color: '#fb923c' },
    { path: '/notices', label: 'Notices', icon: Bell, roles: ['admin', 'teacher', 'student'], color: '#f43f5e' },
    { path: '/chat', label: 'AI Chat', icon: MessageSquare, roles: ['teacher', 'student', 'admin'], color: '#a78bfa' },
    { path: '/profile', label: 'Profile', icon: User, roles: ['admin', 'teacher', 'student'], color: '#94a3b8' },
];

const roleColors = { admin: '#f43f5e', teacher: '#06b6d4', student: '#6366f1' };

const Sidebar = ({ filtered, initials, accent, userData, currentPath, onLogout }) => (
    <aside style={{
        width: SIDEBAR_W,
        background: 'var(--c-sidebar-bg)',
        borderRight: '1px solid var(--c-border)',
        display: 'flex', flexDirection: 'column',
        height: '100%', overflowY: 'auto', flexShrink: 0,
    }}>
        {/* Logo */}
        <div style={{ padding: '16px 14px', borderBottom: '1px solid var(--c-border)' }}>
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>E</span>
                </div>
                <span style={{ fontFamily: 'Space Grotesk,sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--c-text)' }}>EduSmart</span>
            </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.map(item => {
                const Icon = item.icon;
                const active = currentPath === item.path;
                return (
                    <Link key={item.path} to={item.path} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                        borderRadius: 8, textDecoration: 'none',
                        background: active ? `${item.color}15` : 'transparent',
                        color: active ? item.color : 'var(--c-muted)',
                        fontSize: '0.82rem', fontWeight: active ? 600 : 500,
                        transition: 'all 0.15s ease',
                    }}>
                        <Icon size={16} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--c-border)' }}>
            <Link to="/profile" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                textDecoration: 'none', marginBottom: 4,
            }}>
                <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: accent + '20', color: accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700,
                }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{userData?.name || 'User'}</p>
                    <p style={{ fontSize: '0.6rem', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{userData?.role || ''}</p>
                </div>
            </Link>
            <button onClick={onLogout} style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'transparent', color: 'var(--c-muted)',
                fontSize: '0.78rem', fontWeight: 500,
            }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-muted)'; }}
            >
                <LogOut size={14} /> Sign out
            </button>
        </div>
    </aside>
);

const SidebarLayout = () => {
    useSocketNotifications();
    const { theme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState(null);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const decoded = jwtDecode(token);
            setUserRole(decoded.role);
            api.get('/user/profile').then(r => r.data && setUserData(r.data)).catch(() => {});
            const socket = getSocket();
            if (socket) {
                const h = (data) => { if (data.userId === decoded.id) setUserData(data.user); };
                socket.on('PROFILE_UPDATED', h);
                return () => socket.off('PROFILE_UPDATED', h);
            }
        } catch { /* invalid token */ }
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Tear down the socket singleton so the next login re-handshakes with
        // fresh credentials (otherwise the old user's JWT stays in the
        // handshake and they keep receiving the previous user's events)
        disconnectSocket();
        navigate('/');
    };
    const filtered = navItems.filter(i => i.roles.includes(userRole));
    const initials = userData?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
    const accent = roleColors[userRole] || '#6366f1';
    const current = filtered.find(n => n.path === location.pathname);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', color: 'var(--c-text)' }}>
            {/* Desktop Sidebar */}
            <div style={{ display: 'none', position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W, zIndex: 50 }} className="lg:block">
                <Sidebar filtered={filtered} initials={initials} accent={accent} userData={userData} currentPath={location.pathname} onLogout={handleLogout} />
            </div>

            {/* Mobile Sidebar */}
            {mobileOpen && (
                <>
                    <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)' }} />
                    <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W, zIndex: 50 }}>
                        <Sidebar filtered={filtered} initials={initials} accent={accent} userData={userData} currentPath={location.pathname} onLogout={handleLogout} />
                    </div>
                </>
            )}

            {/* Main */}
            <div className="lg:ml-[240px] w-full" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                {/* Top bar */}
                <header style={{
                    position: 'sticky', top: 0, zIndex: 30, height: 52,
                    background: 'var(--c-topbar-bg)',
                    borderBottom: '1px solid var(--c-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 16px', gap: 12, width: '100%', boxSizing: 'border-box'
                }}>
                    <button onClick={() => setMobileOpen(t => !t)} style={{
                        flexShrink: 0, background: 'none', border: 'none', color: 'var(--c-text)',
                        cursor: 'pointer', padding: 4, display: 'flex',
                    }} className="lg:hidden">
                        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--c-text)' }}>
                            {current?.label || 'EduSmart'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                        <ThemeToggle />
                        <Notifications />
                    </div>
                </header>

                {/* Page content */}
                <main style={{ flex: 1, padding: '20px 16px', overflowX: 'hidden' }}>
                    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SidebarLayout;
