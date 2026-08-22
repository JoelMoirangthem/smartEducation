import { useEffect, useState } from 'react';
import { Users, GraduationCap, BookOpen, Layers, Loader2 } from 'lucide-react';
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
        <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--c-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Loading…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const metrics = [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#6366f1' },
        { label: 'Students', value: stats.activeStudents, icon: GraduationCap, color: '#34d399' },
        { label: 'Teachers', value: stats.activeTeachers, icon: BookOpen, color: '#06b6d4' },
        { label: 'Classes / Subjects', value: `${stats.totalClasses} / ${stats.totalSubjects}`, icon: Layers, color: ACCENT },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>Admin Dashboard</h1>
                <p style={{ color: 'var(--c-muted)', fontSize: '0.85rem', marginTop: 4 }}>Overview of your institution</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {metrics.map((m, i) => (
                    <div key={i} style={{
                        padding: '20px', borderRadius: 14,
                        background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
                        display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                        <div style={{
                            width: 42, height: 42, borderRadius: 12,
                            background: m.color + '15',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <m.icon size={20} color={m.color} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{m.label}</p>
                            <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--c-text)', margin: '2px 0 0' }}>{m.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
