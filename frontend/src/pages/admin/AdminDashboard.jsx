import { useEffect, useState } from 'react';
import { Users, GraduationCap, BookOpen, Layers, Loader2, TrendingUp, ShieldCheck, Sparkles, ArrowUpRight } from 'lucide-react';
import api from '../../services/api';

const ACCENT = '#f43f5e';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ totalUsers: 0, activeStudents: 0, activeTeachers: 0, totalClasses: 0, totalSubjects: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/stats')
            .then(res => { setStats(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ minHeight: '52vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--c-muted)' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontWeight: 600 }}>Loading overview…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const metrics = [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#6366f1', hint: 'Active accounts' },
        { label: 'Students', value: stats.activeStudents, icon: GraduationCap, color: '#10b981', hint: 'Enrolled learners' },
        { label: 'Teachers', value: stats.activeTeachers, icon: BookOpen, color: '#06b6d4', hint: 'Faculty' },
        { label: 'Classes / Subjects', value: `${stats.totalClasses} / ${stats.totalSubjects}`, icon: Layers, color: ACCENT, hint: 'Academic structure' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* Header */}
            <div style={{
                padding: '32px 32px 28px', borderRadius: 'var(--r-2xl)',
                background: `linear-gradient(135deg, ${ACCENT}14, ${ACCENT}08 38%, var(--c-card-bg) 72%), var(--c-card-bg)`,
                border: '1px solid var(--c-border)', backdropFilter: 'blur(18px)', boxShadow: 'var(--shadow-sm)',
                position: 'relative', overflow: 'hidden', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20
            }}>
                <div style={{ position: 'absolute', top: -50, right: -30, width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(closest-side, ${ACCENT}16, transparent)` }} />
                <div style={{ position: 'relative' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: `${ACCENT}12`, border: `1px solid ${ACCENT}20`, marginBottom: 12 }}>
                        <ShieldCheck size={14} color={ACCENT} />
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT }}>Admin command</span>
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 850, color: 'var(--c-text)', margin: 0, letterSpacing: '-0.04em', lineHeight: 1.05 }}>Institution Overview</h1>
                    <p style={{ color: 'var(--c-muted)', fontSize: '0.96rem', marginTop: 8, fontWeight: 500 }}>Spacious control center — monitor people, cohorts and curriculum at a glance.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 14, background: 'var(--c-surface)', border: '1px solid var(--c-border)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--c-text)' }}>
                        <TrendingUp size={16} color={ACCENT} /> Live stats
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
                {metrics.map((m, i) => (
                    <div key={i} style={{
                        padding: '24px 24px 22px', borderRadius: 'var(--r-xl)',
                        background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
                        backdropFilter: 'blur(14px)', boxShadow: 'var(--shadow-sm)',
                        display: 'flex', alignItems: 'center', gap: 18, position: 'relative', overflow: 'hidden',
                        transition: 'all 0.22s var(--ease-out)', animation: `fadeUp 0.4s var(--ease-out) ${i * 0.06}s both`
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = m.color + '22'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}
                    >
                        <div style={{ position: 'absolute', top: -18, right: -18, width: 90, height: 90, borderRadius: '50%', background: `${m.color}08`, border: `1px solid ${m.color}10` }} />
                        <div style={{
                            width: 52, height: 52, borderRadius: 16,
                            background: m.color + '14',
                            border: `1px solid ${m.color}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <m.icon size={22} color={m.color} strokeWidth={1.9} />
                        </div>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <p style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{m.label}</p>
                            <p style={{ fontSize: '1.55rem', fontWeight: 850, color: 'var(--c-text)', margin: '4px 0 0', letterSpacing: '-0.03em', lineHeight: 1 }}>{m.value}</p>
                            <p style={{ fontSize: '0.72rem', color: 'var(--c-muted)', marginTop: 4, fontWeight: 500 }}>{m.hint}</p>
                        </div>
                        <ArrowUpRight size={14} color="var(--c-muted)" style={{ opacity: 0.4 }} />
                    </div>
                ))}
            </div>

            <div style={{
                padding: '24px 24px', borderRadius: 'var(--r-xl)', background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 40, height: 40, borderRadius: 12, background: '#8b5cf614', border: '1px solid #8b5cf622', display: 'grid', placeItems: 'center', color: '#8b5cf6' }}><Sparkles size={16} /></span>
                    <div>
                        <p style={{ fontWeight: 750, color: 'var(--c-text)', margin: 0, fontSize: '0.92rem', letterSpacing: '-0.01em' }}>Tip: Use the Academic and Users tabs to manage cohorts in full-screen.</p>
                        <p style={{ color: 'var(--c-muted)', fontSize: '0.82rem', margin: 0 }}>Spacious tables and filters are now optimized for larger viewports.</p>
                    </div>
                </div>
            </div>
            <style>{`@keyframes fadeUp{from{opacity:0; transform:translateY(10px)}to{opacity:1; transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}
