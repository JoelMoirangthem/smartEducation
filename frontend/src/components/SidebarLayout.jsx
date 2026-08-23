import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import {
    LayoutDashboard, CheckSquare, BookOpen, GraduationCap, Bell,
    MessageSquare, User, LogOut, Menu, X, Library,
    Users, ScanFace, Sparkles, Search
} from 'lucide-react';
import Notifications from './Notifications';
import useSocketNotifications from '../hooks/useSocketNotifications.jsx';
import { getSocket, disconnectSocket } from '../services/socket.service';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const SIDEBAR_W = 300;

const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'], color: '#6366f1', group: 'Overview' },
    { path: '/admin/academic', label: 'Academic', icon: Library, roles: ['admin'], color: '#06b6d4', group: 'Manage' },
    { path: '/admin/users', label: 'Users', icon: Users, roles: ['admin'], color: '#a78bfa', group: 'Manage' },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['teacher', 'student'], color: '#6366f1', group: 'Overview' },
    { path: '/attendance', label: 'Attendance', icon: CheckSquare, roles: ['teacher', 'student'], color: '#10b981', group: 'Learning' },
    { path: '/face-register', label: 'Register Face', icon: ScanFace, roles: ['student'], color: '#f472b6', group: 'Learning' },
    { path: '/face-attendance', label: 'Face Attendance', icon: ScanFace, roles: ['teacher'], color: '#f472b6', group: 'Learning' },
    { path: '/marks', label: 'Marks', icon: GraduationCap, roles: ['teacher', 'student'], color: '#f59e0b', group: 'Learning' },
    { path: '/notes', label: 'Notes', icon: BookOpen, roles: ['teacher', 'student'], color: '#fb923c', group: 'Learning' },
    { path: '/notices', label: 'Notices', icon: Bell, roles: ['admin', 'teacher', 'student'], color: '#ef4444', group: 'Connect' },
    { path: '/chat', label: 'AI Chat', icon: MessageSquare, roles: ['teacher', 'student', 'admin'], color: '#8b5cf6', group: 'Connect' },
    { path: '/profile', label: 'Profile', icon: User, roles: ['admin', 'teacher', 'student'], color: '#64748b', group: 'Connect' },
];

const roleColors = { admin: '#f43f5e', teacher: '#06b6d4', student: '#6366f1' };
const roleLabels = { admin: 'Administrator', teacher: 'Educator', student: 'Learner' };

const Sidebar = ({ filtered, initials, accent, userData, currentPath, onLogout }) => {
    const groups = filtered.reduce((acc, item) => {
        const g = item.group || 'Other';
        if (!acc.find(x => x.label === g)) acc.push({ label: g, items: [] });
        acc.find(x => x.label === g).items.push(item);
        return acc;
    }, []);

    return (
        <aside style={{
            width: SIDEBAR_W,
            background: 'var(--c-sidebar-bg)',
            backdropFilter: 'blur(22px) saturate(1.15)',
            WebkitBackdropFilter: 'blur(22px) saturate(1.15)',
            borderRight: '1px solid var(--c-border)',
            display: 'flex', flexDirection: 'column',
            height: '100%', overflowY: 'auto', flexShrink: 0,
            boxShadow: '4px 0 32px rgba(0,0,0,0.14)',
        }}>
            {/* Top accent glow */}
            <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}90, transparent)`, opacity: 0.9 }} />

            {/* Logo */}
            <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid var(--c-border)' }}>
                <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 8px 20px ${accent}30, 0 2px 6px rgba(0,0,0,0.15)`,
                        border: '1px solid rgba(255,255,255,0.14)',
                    }}>
                        <span style={{ color: 'white', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>E</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--c-text)', letterSpacing: '-0.03em', lineHeight: 1 }}>EduSmart</span>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--c-muted)', opacity: 0.85 }}>Campus OS</span>
                    </div>
                    <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px rgba(34,197,94,0.6)', flexShrink: 0 }} />
                </Link>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '20px 16px 12px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {groups.map(section => (
                    <div key={section.label}>
                        <p style={{
                            fontSize: '0.63rem', fontWeight: 800, letterSpacing: '0.14em',
                            textTransform: 'uppercase', color: 'var(--c-muted)', opacity: 0.7,
                            marginBottom: 10, paddingLeft: 12
                        }}>{section.label}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {section.items.map(item => {
                                const Icon = item.icon;
                                const active = currentPath === item.path;
                                return (
                                    <Link key={item.path} to={item.path} style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                                        borderRadius: 'var(--nav-radius)', textDecoration: 'none',
                                        background: active ? `${item.color}14` : 'transparent',
                                        border: active ? `1px solid ${item.color}20` : '1px solid transparent',
                                        color: active ? item.color : 'var(--c-muted)',
                                        fontSize: '0.92rem', fontWeight: active ? 700 : 500,
                                        letterSpacing: '-0.01em',
                                        transition: 'all 0.2s var(--ease-out)',
                                        position: 'relative', overflow: 'hidden',
                                    }}
                                    onMouseEnter={e => {
                                        if (!active) {
                                            e.currentTarget.style.background = 'var(--c-surface)';
                                            e.currentTarget.style.color = 'var(--c-text)';
                                            e.currentTarget.style.borderColor = 'var(--c-border)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!active) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--c-muted)';
                                            e.currentTarget.style.borderColor = 'transparent';
                                        }
                                    }}
                                    >
                                        {active && (
                                            <span style={{
                                                position: 'absolute', left: 0, top: 8, bottom: 8, width: 3,
                                                borderRadius: 99, background: item.color
                                            }} />
                                        )}
                                        <span style={{
                                            width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center',
                                            background: active ? `${item.color}18` : 'var(--c-surface)',
                                            border: active ? `1px solid ${item.color}18` : '1px solid var(--c-border)',
                                            flexShrink: 0,
                                            transition: 'all 0.2s',
                                        }}>
                                            <Icon size={16} style={{ opacity: active ? 1 : 0.9 }} />
                                        </span>
                                        <span style={{ flex: 1 }}>{item.label}</span>
                                        {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, boxShadow: `0 0 8px ${item.color}60` }} />}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User footer */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--c-border)', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.04))' }}>
                <Link to="/profile" style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px', borderRadius: 16,
                    textDecoration: 'none', marginBottom: 12,
                    background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-surface-hover)'; e.currentTarget.style.borderColor = 'var(--c-border-strong)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--c-surface)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}
                >
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: `linear-gradient(135deg, ${accent}22, ${accent}14)`,
                        border: `1px solid ${accent}22`,
                        color: accent,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 800, flexShrink: 0,
                    }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0, letterSpacing: '-0.01em' }}>{userData?.name || 'User'}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--c-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>{roleLabels[userData?.role] || userData?.role || ''}</p>
                    </div>
                    <span title="Online" style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid var(--c-surface)', boxShadow: '0 0 0 2px rgba(34,197,94,0.18)', flexShrink: 0 }} />
                </Link>
                <button onClick={onLogout} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
                    padding: '11px', borderRadius: 12, border: '1px solid var(--c-border)', cursor: 'pointer',
                    background: 'var(--c-surface)', color: 'var(--c-muted)',
                    fontSize: '0.85rem', fontWeight: 600, letterSpacing: '-0.01em',
                    transition: 'all 0.18s',
                }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-muted)'; e.currentTarget.style.background = 'var(--c-surface)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}
                >
                    <LogOut size={16} /> Sign out
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.62rem', color: 'var(--c-muted)', opacity: 0.5, marginTop: 12, letterSpacing: '0.08em' }}>v2.0 • Spacious</p>
            </div>
        </aside>
    );
};

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
        disconnectSocket();
        navigate('/');
    };
    const filtered = navItems.filter(i => i.roles.includes(userRole));
    const initials = userData?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
    const accent = roleColors[userRole] || '#6366f1';
    const current = filtered.find(n => n.path === location.pathname);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', color: 'var(--c-text)', background: 'transparent' }}>
            {/* Desktop Sidebar */}
            <div style={{ display: 'none', position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W, zIndex: 50 }} className="lg:block">
                <Sidebar filtered={filtered} initials={initials} accent={accent} userData={userData} currentPath={location.pathname} onLogout={handleLogout} />
            </div>

            {/* Mobile Sidebar */}
            {mobileOpen && (
                <>
                    <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(3,5,17,0.54)', backdropFilter: 'blur(6px)' }} />
                    <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W, zIndex: 50, boxShadow: '24px 0 64px rgba(0,0,0,0.32)', animation: 'slideIn 0.28s var(--ease-out)' }}>
                        <Sidebar filtered={filtered} initials={initials} accent={accent} userData={userData} currentPath={location.pathname} onLogout={handleLogout} />
                    </div>
                </>
            )}

            {/* Main */}
            <div className="lg:ml-[300px] w-full" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                {/* Top bar */}
                <header style={{
                    position: 'sticky', top: 0, zIndex: 30, height: 'var(--topbar-h)',
                    background: 'var(--c-topbar-bg)',
                    backdropFilter: 'blur(20px) saturate(1.2)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
                    borderBottom: '1px solid var(--c-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 var(--content-gutter)', gap: 16, width: '100%', boxSizing: 'border-box',
                    boxShadow: '0 1px 16px rgba(0,0,0,0.06)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                        <button onClick={() => setMobileOpen(t => !t)} style={{
                            flexShrink: 0, background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text)',
                            cursor: 'pointer', width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center',
                            transition: 'all 0.15s',
                        }} className="lg:hidden">
                            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <span style={{
                                    width: 40, height: 40, borderRadius: 12, display: 'none',
                                    background: `${accent}14`, border: `1px solid ${accent}20`, placeItems: 'center', color: accent
                                }} className="hidden sm:grid">
                                    {current?.icon ? <current.icon size={18} /> : <LayoutDashboard size={18} />}
                                </span>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--c-text)', letterSpacing: '-0.02em', margin: 0, whiteSpace: 'nowrap' }}>
                                            {current?.label || 'Workspace'}
                                        </h2>
                                        <span style={{ display: 'none', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 700, color: 'var(--c-muted)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', padding: '3px 8px', borderRadius: 999 }} className="sm:inline-flex">
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} /> {roleLabels[userRole] || userRole || ''}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.74rem', color: 'var(--c-muted)', fontWeight: 500, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'none' }} className="sm:block">
                                        {current ? `${current.label} • EduSmart` : 'AI-Native Campus OS'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                        <div style={{
                            display: 'none', alignItems: 'center', gap: 8,
                            background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 999,
                            padding: '8px 14px', color: 'var(--c-muted)', fontSize: '0.82rem'
                        }} className="xl:flex">
                            <Search size={14} />
                            <span style={{ opacity: 0.7 }}>Search courses, marks…</span>
                            <span style={{ marginLeft: 10, fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em', background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', padding: '2px 6px', borderRadius: 6 }}>⌘K</span>
                        </div>
                        <ThemeToggle />
                        <Notifications />
                    </div>
                </header>

                {/* Page content — full bleed spacious */}
                <main style={{ flex: 1, padding: '32px var(--content-gutter) 48px', overflowX: 'hidden' }}>
                    <div style={{ width: 'min(100%, var(--content-max))', margin: '0 auto' }}>
                        <div style={{ animation: 'fadeUp 0.5s var(--ease-out)' }}>
                            <Outlet />
                        </div>
                    </div>
                </main>

                <footer style={{ padding: '18px var(--content-gutter)', borderTop: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: 'var(--c-surface)', backdropFilter: 'blur(10px)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>© 2026 EduSmart — Crafted for spacious learning</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={12} /> AI-Native Campus OS</span>
                </footer>
            </div>
            <style>{`@keyframes slideIn { from { transform: translateX(-12px); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>
        </div>
    );
};

export default SidebarLayout;
