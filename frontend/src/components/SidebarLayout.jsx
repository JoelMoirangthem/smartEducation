import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import {
    LayoutDashboard, CheckSquare, BookOpen, GraduationCap, Bell,
    MessageSquare, User, LogOut, Menu, X, Sparkles, Library,
    Users, ScanFace, ChevronRight
} from 'lucide-react';
import Notifications from './Notifications';
import useSocketNotifications from '../hooks/useSocketNotifications.jsx';
import { getSocket } from '../services/socket.service';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const SIDEBAR_W = 260;

const navItems = [
    { path: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, roles: ['admin'], color: '#6366f1' },
    { path: '/admin/academic', label: 'Academic Setup', icon: Library, roles: ['admin'], color: '#06b6d4' },
    { path: '/admin/users', label: 'User Management', icon: Users, roles: ['admin'], color: '#a78bfa' },
    { path: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard, roles: ['teacher', 'student'], color: '#6366f1' },
    { path: '/attendance', label: 'QR Attendance', icon: CheckSquare, roles: ['teacher', 'student'], color: '#34d399' },
    { path: '/face-register', label: 'Register Face', icon: ScanFace, roles: ['student'], color: '#f472b6' },
    { path: '/face-attendance', label: 'Face Attendance', icon: ScanFace, roles: ['teacher'], color: '#f472b6' },
    { path: '/marks', label: 'Marks & AI Coach', icon: GraduationCap, roles: ['teacher', 'student'], color: '#fbbf24' },
    { path: '/notes', label: 'Notes & Resources', icon: BookOpen, roles: ['teacher', 'student'], color: '#fb923c' },
    { path: '/notices', label: 'Notices', icon: Bell, roles: ['admin', 'teacher', 'student'], color: '#f43f5e' },
    { path: '/chat', label: 'AI Assistant', icon: Sparkles, roles: ['teacher', 'student', 'admin'], color: '#a78bfa' },
    { path: '/profile', label: 'Profile', icon: User, roles: ['admin', 'teacher', 'student'], color: '#94a3b8' },
];

const roleColors = { admin: '#f43f5e', teacher: '#06b6d4', student: '#6366f1' };

const SidebarLayout = () => {
    useSocketNotifications();

    const { theme } = useTheme();
    const isLight = theme === 'light';

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
            fetch('http://localhost:5000/api/v1/user/profile', {
                headers: { Authorization: `Bearer ${token}` }
            }).then(r => r.ok ? r.json() : null).then(d => d && setUserData(d));

            const socket = getSocket();
            if (socket) {
                const h = (data) => { if (data.userId === decoded.id) setUserData(data.user); };
                socket.on('PROFILE_UPDATED', h);
                return () => socket.off('PROFILE_UPDATED', h);
            }
        } catch (e) { }
    }, []);

    // Close mobile menu on route change
    useEffect(() => setMobileOpen(false), [location.pathname]);

    const handleLogout = () => { localStorage.removeItem('token'); navigate('/'); };

    const filtered = navItems.filter(i => i.roles.includes(userRole));
    const initials = userData?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
    const accent = roleColors[userRole] || '#6366f1';
    const current = filtered.find(n => n.path === location.pathname);

    const Sidebar = () => (
        <aside style={{
            width: SIDEBAR_W,
            background: 'var(--c-sidebar-bg)',
            backdropFilter: 'blur(30px)',
            borderRight: '1px solid var(--c-border)',
            display: 'flex', flexDirection: 'column',
            height: '100%', overflowY: 'auto', flexShrink: 0,
        }}>
            {/* Logo */}
            <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid var(--c-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 11,
                        background: 'linear-gradient(135deg,#6366f1,#7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(99,102,241,0.4)', flexShrink: 0,
                    }}>
                        <Sparkles size={16} color="white" />
                    </div>
                    <div>
                        <p style={{ fontFamily: 'Space Grotesk,sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--c-text)', lineHeight: 1 }}>EduSmart</p>
                        <p style={{ fontSize: '0.55rem', color: 'var(--c-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>AI Education Platform</p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <p style={{ fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--c-muted)', padding: '0 6px', marginBottom: 8 }}>Navigation</p>
                {filtered.map(item => {
                    const Icon = item.icon;
                    const active = location.pathname === item.path;
                    return (
                        <Link key={item.path} to={item.path} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                            borderRadius: 12, textDecoration: 'none',
                            border: `1px solid ${active ? item.color + '40' : 'transparent'}`,
                            background: active ? `linear-gradient(135deg,${item.color}18,${item.color}08)` : 'transparent',
                            color: active ? (isLight ? '#1e2035' : 'white') : 'var(--c-nav-inactive)',
                            transition: 'all 0.2s ease',
                        }}
                            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = isLight ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = isLight ? '#1e2035' : 'white'; } }}
                            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-nav-inactive)'; } }}
                        >
                            <div style={{
                                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                                background: active ? `${item.color}22` : 'var(--c-nav-inactive-bg)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Icon size={14} color={active ? item.color : 'var(--c-nav-inactive)'} />
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 500, flex: 1 }}>{item.label}</span>
                            {active && <ChevronRight size={12} color={item.color + '99'} />}
                        </Link>
                    );
                })}
            </nav>

            {/* User footer */}
            <div style={{ padding: '10px', borderTop: '1px solid var(--c-border)' }}>
                <Link to="/profile" style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 12,
                    textDecoration: 'none', background: 'var(--c-surface)',
                    border: '1px solid var(--c-border)', marginBottom: 6, transition: 'all 0.2s ease',
                }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${accent}12`; e.currentTarget.style.borderColor = `${accent}30`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--c-surface)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}
                >
                    <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: `${accent}22`, border: `1px solid ${accent}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700, color: accent,
                    }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userData?.name || 'User'}</p>
                        <p style={{ fontSize: '0.58rem', color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 1 }}>{userRole || '—'}</p>
                    </div>
                </Link>
                <button onClick={handleLogout} style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'rgba(239,68,68,0.06)', color: 'rgba(239,68,68,0.65)',
                    fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s ease',
                }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#f87171'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.color = 'rgba(239,68,68,0.65)'; }}
                >
                    <LogOut size={14} /> Sign Out
                </button>
            </div>
        </aside>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter,sans-serif', color: 'var(--c-text)', position: 'relative', zIndex: 1 }}>

            {/* ── DESKTOP SIDEBAR (always visible ≥ 1024px) ── */}
            <div style={{
                display: 'none', position: 'fixed', top: 0, left: 0, bottom: 0,
                width: SIDEBAR_W, zIndex: 50,
            }} className="lg:block">
                <Sidebar />
            </div>

            {/* ── MOBILE SIDEBAR OVERLAY ── */}
            {mobileOpen && (
                <>
                    <div onClick={() => setMobileOpen(false)} style={{
                        position: 'fixed', inset: 0, zIndex: 40,
                        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)',
                    }} />
                    <div style={{
                        position: 'fixed', top: 0, left: 0, bottom: 0,
                        width: SIDEBAR_W, zIndex: 50,
                    }}>
                        <Sidebar />
                    </div>
                </>
            )}

            {/* ── MAIN AREA ── */}
            <div className="lg:ml-[260px] w-full" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin-left 0.3s ease' }}>

                {/* Top bar */}
                <header style={{
                    position: 'sticky', top: 0, zIndex: 30, height: 60,
                    background: 'var(--c-topbar-bg)', backdropFilter: 'blur(24px)',
                    borderBottom: '1px solid var(--c-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 20px', gap: 12, width: '100%', boxSizing: 'border-box'
                }}>
                    {/* Hamburger (mobile only) */}
                    <button onClick={() => setMobileOpen(t => !t)} style={{
                        flexShrink: 0, background: 'none', border: 'none', color: 'var(--c-text)',
                        cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center',
                    }} className="lg:hidden">
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    {/* Breadcrumb & Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>{userRole}</span>
                            <ChevronRight size={11} color="var(--c-muted)" />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {current?.label || 'EduSmart'}
                        </span>
                    </div>

                    {/* Right side */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
                        <ThemeToggle />
                        <Notifications />
                        <Link to="/profile" style={{
                            width: 33, height: 33, borderRadius: 9, textDecoration: 'none', flexShrink: 0,
                            background: `${accent}22`, border: `1px solid ${accent}44`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.68rem', fontWeight: 700, color: accent,
                        }}>
                            {initials}
                        </Link>
                    </div>
                </header>

                {/* Page content */}
                <main style={{ flex: 1, padding: '24px 20px', overflowX: 'hidden' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SidebarLayout;
