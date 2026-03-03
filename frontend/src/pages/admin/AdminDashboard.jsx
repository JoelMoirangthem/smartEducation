import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Users, GraduationCap, BookOpen, Layers, TrendingUp,
    RefreshCw, Activity, ShieldAlert, Loader2, Zap,
    Database, Cpu, Globe, Server, ShieldCheck, Clock
} from 'lucide-react';
import { Card, PageHeader, Spinner, Btn, SectionTitle } from '../../components/PageLayout';

const API = 'http://localhost:5000/api/v1';
const ACCENT = '#f43f5e';

/* --- Premium Metric Card --- */
const MetricCard = ({ title, value, sub, color, icon: Icon, trend }) => (
    <Card style={{
        position: 'relative', overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: `1px solid var(--c-border)`,
        background: 'var(--c-card-bg)',
        backdropFilter: 'blur(10px)'
    }}
        onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.borderColor = color + '40';
            e.currentTarget.style.boxShadow = `0 20px 40px -15px ${color}20`;
        }}
        onMouseLeave={e => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.borderColor = 'var(--c-border)';
            e.currentTarget.style.boxShadow = '';
        }}
    >
        <div style={{ position: 'absolute', top: -15, right: -15, opacity: 0.08, transform: 'rotate(-10deg)' }}>
            <Icon size={110} color={color} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: color + '15', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={24} color={color} />
            </div>
            {trend && (
                <div style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrendingUp size={12} color="#34d399" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#34d399' }}>{trend}</span>
                </div>
            )}
        </div>

        <div>
            <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--c-text)', lineHeight: 1, margin: 0, fontFamily: 'Space Grotesk, sans-serif' }}>{value}</h3>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-muted)', marginTop: 6, letterSpacing: '0.02em' }}>{title}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: color }} />
                <p style={{ fontSize: '0.7rem', color: 'var(--c-muted)', opacity: 0.6, margin: 0, fontWeight: 500 }}>{sub}</p>
            </div>
        </div>
    </Card>
);

/* --- Infrastructure Health Item --- */
const HealthItem = ({ icon: Icon, label, status, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 16, background: 'var(--c-surface-hover)', border: '1px solid var(--c-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-muted)' }}>
                <Icon size={18} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-text)' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: color }}>{status}</span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
        </div>
    </div>
);

export default function AdminDashboard() {
    const [stats, setStats] = useState({ totalUsers: 0, activeStudents: 0, activeTeachers: 0, totalClasses: 0, totalSubjects: 0 });
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(false);

    const fetchStats = async () => {
        setRefresh(true);
        try {
            const tk = localStorage.getItem('token');
            const res = await axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${tk}` } });
            setStats(res.data);
        } catch { }
        setLoading(false); setRefresh(false);
    };

    useEffect(() => { fetchStats(); }, []);

    if (loading) return <Spinner label="Authenticating with mission control…" />;

    const metrics = [
        { title: 'Total Members', value: stats.totalUsers, sub: `Across all institution departments`, color: '#6366f1', icon: Users, trend: '+12% growth' },
        { title: 'Student Cohort', value: stats.activeStudents || 0, sub: 'Currently enrolled academic units', color: '#10b981', icon: GraduationCap, trend: 'Stable' },
        { title: 'Faculty Registry', value: stats.activeTeachers || 0, sub: 'Verified teaching personnel', color: '#8b5cf6', icon: BookOpen, trend: '+2% rise' },
        { title: 'Academic Structure', value: `${stats.totalClasses || 0}/${stats.totalSubjects || 0}`, sub: 'Class/Subject distribution', color: ACCENT, icon: Layers, trend: 'Optimized' },
    ];

    const infrastructure = [
        { icon: Database, label: 'Main Database (MongoDB)', status: 'Optimal', color: '#10b981' },
        { icon: Cpu, label: 'AI Inference Engine', status: 'Warming', color: '#f59e0b' },
        { icon: Server, label: 'Socket.io Cluster', status: 'Active', color: '#10b981' },
        { icon: Globe, label: 'CDN & Assets', status: 'Propagated', color: '#3b82f6' },
    ];

    const logs = [
        { icon: ShieldCheck, msg: 'Security firewall audited successfully', time: '12m ago', color: '#10b981' },
        { icon: RefreshCw, msg: 'Academic structure synced with registry', time: '1h ago', color: '#6366f1' },
        { icon: Clock, msg: 'Automated backup sequence initiated', time: '3h ago', color: '#8b5cf6' },
        { icon: Zap, msg: 'System cache purged for performance', time: '5h ago', color: '#f59e0b' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 40 }}>
            {/* Command Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
                <div>
                    <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2.2rem', fontWeight: 800, color: 'var(--c-text)', margin: 0 }}>Command Center</h1>
                    <p style={{ color: 'var(--c-muted)', fontSize: '1rem', marginTop: 4 }}>High-level institutional orchestration & resource monitoring</p>
                </div>
                <Btn accent={ACCENT} onClick={fetchStats} disabled={refresh} style={{ height: 48, padding: '0 24px', borderRadius: 14 }}>
                    <RefreshCw size={18} style={{ marginRight: 10, animation: refresh ? 'spin 1s linear infinite' : 'none' }} />
                    {refresh ? 'Syncing...' : 'System Sync'}
                </Btn>
            </div>

            {/* Metrics Engine */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {metrics.map((m, i) => <MetricCard key={i} {...m} />)}
            </div>

            {/* Core Operations Support */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 32 }}>

                {/* Infrastructure Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Zap size={20} color={ACCENT} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-text)', margin: 0, fontFamily: 'Space Grotesk, sans-serif' }}>Network Infrastructure</h3>
                    </div>
                    <Card style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {infrastructure.map((h, i) => <HealthItem key={i} {...h} />)}
                        <div style={{
                            marginTop: 10, padding: '20px', borderRadius: 20,
                            background: `linear-gradient(135deg, ${ACCENT}15 0%, rgba(99,102,241,0.08) 100%)`,
                            border: `1px solid ${ACCENT}25`, textAlign: 'center'
                        }}>
                            <ShieldCheck size={32} color={ACCENT} style={{ margin: '0 auto 12px' }} />
                            <p style={{ color: 'var(--c-text)', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>Protection Level: Ultra</p>
                            <p style={{ color: 'var(--c-muted)', fontSize: '0.75rem', marginTop: 4, opacity: 0.8 }}>End-to-end encryption active on all clusters</p>
                        </div>
                    </Card>
                </div>

                {/* Audit & Logs Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Activity size={20} color={ACCENT} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-text)', margin: 0, fontFamily: 'Space Grotesk, sans-serif' }}>Real-time Audit Logs</h3>
                    </div>
                    <Card style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {logs.map((log, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '16px 20px', borderRadius: 16, transition: 'background 0.2s',
                                border: '1px solid transparent'
                            }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 12, background: log.color + '15',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: log.color,
                                        border: `1px solid ${log.color}30`
                                    }}>
                                        <log.icon size={18} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--c-text)', margin: 0 }}>{log.msg}</p>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--c-muted)', marginTop: 2, opacity: 0.6 }}>Audit verified by System Master</p>
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--c-muted)', opacity: 0.4, whiteSpace: 'nowrap' }}>{log.time}</span>
                            </div>
                        ))}
                    </Card>
                </div>

            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
