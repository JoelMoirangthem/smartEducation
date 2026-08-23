import { useState, useEffect, useCallback } from "react";
import { toast } from 'react-toastify';
import { jwtDecode } from "jwt-decode";
import { initializeSocket } from "../services/socket.service";
import useSocketEvent from "../hooks/useSocketEvent";
import { Bell, Send, Clock, User, Loader2, X, Pencil, Trash2 } from "lucide-react";
import { Card, PageHeader, Spinner, Btn, Select, Label, Input, Textarea, Empty, Badge, SectionTitle } from "../components/PageLayout";

import api from '../services/api';

const ACCENT = 'var(--c-primary)';
const EMPTY_FORM = { title: '', content: '', targetType: 'CLASS', targetRole: 'all', classId: '', subjectId: '', priority: 'medium' };

const P_COLOR = {
    urgent: { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.25)', label: 'CRITICAL' },
    high: { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316', border: 'rgba(249, 115, 22, 0.25)', label: 'HIGH' },
    medium: { bg: 'rgba(99, 102, 241, 0.12)', text: '#6366f1', border: 'rgba(99, 102, 241, 0.25)', label: 'STANDARD' },
    low: { bg: 'rgba(34, 197, 94, 0.12)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.25)', label: 'GENERAL' },
};

const PriorityBadge = ({ p }) => {
    const s = P_COLOR[p] || P_COLOR.medium;
    return (
        <span style={{
            padding: '4px 12px', borderRadius: 12, fontSize: '0.65rem',
            fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: s.bg, border: `1px solid ${s.border}`, color: s.text,
            display: 'inline-flex', alignItems: 'center', backdropFilter: 'blur(10px)'
        }}>
            {s.label}
        </span>
    );
};

const iconBtnStyle = (danger) => ({
    width: 32, height: 32, borderRadius: 9, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${danger ? 'rgba(239, 68, 68, 0.25)' : 'var(--c-border)'}`,
    background: danger ? 'rgba(239, 68, 68, 0.08)' : 'var(--c-surface)',
    color: danger ? '#ef4444' : 'var(--c-muted)',
    transition: 'all 0.15s ease',
});

const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function Notices() {
    const [user, setUser] = useState(null);
    const [notices, setNotices] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [filterSubject, setFilterSubject] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    /* ─── Bootstrap: identity, socket, academic lists ───────────── */
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const decoded = jwtDecode(token);
            setUser(decoded);
            if (decoded.role === "teacher" && decoded.managedClassIds?.length > 0) {
                setForm(p => ({ ...p, classId: decoded.managedClassIds[0] }));
            }
            initializeSocket(decoded.id, decoded.classId, decoded.role);

            const acadBase = decoded.role === 'admin' ? '/admin' : '/user';
            Promise.all([
                api.get(`${acadBase}/classes`),
                api.get(`${acadBase}/subjects`),
            ])
                .then(([c, s]) => {
                    if (decoded.role === 'admin') { setClasses(c.data.classes || []); setSubjects(s.data.subjects || []); }
                    else { setClasses(c.data || []); setSubjects(s.data || []); }
                })
                .catch(() => { /* ignore academic fetch errors */ });
        } catch { /* token decode failed */ }
    }, []);

    /* ─── Data loading (re-runs when the subject filter changes) ── */
    const loadNotices = useCallback(async () => {
        try {
            const params = { limit: 50 };
            if (filterSubject) params.subjectId = filterSubject;
            const res = await api.get('/notices', { params });
            setNotices(res.data.notices || []);
        } catch (e) { console.error(e); }
    }, [filterSubject]);

    useEffect(() => {
        let active = true;
        loadNotices().finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [loadNotices]);

    /* ─── List helpers ──────────────────────────────────────────── */
    const subjectIdOf = (n) => n?.subjectId?._id || n?.subjectId || null;
    const matchesFilter = useCallback((n) =>
        !filterSubject || subjectIdOf(n) === filterSubject, [filterSubject]);

    const upsertNotice = useCallback((n) => {
        if (!n?._id) return;
        setNotices(prev => prev.some(x => x._id === n._id)
            ? prev.map(x => x._id === n._id ? n : x)
            : [n, ...prev]);
    }, []);

    const removeNotice = useCallback((id) => {
        if (!id) return;
        setNotices(prev => prev.filter(x => x._id !== id));
    }, []);

    /* ─── Realtime sync: create / update / delete from any client ── */
    useSocketEvent("notice_created", n => {
        if (n?._id && matchesFilter(n)) upsertNotice(n);
    });

    useSocketEvent("notice_updated", n => {
        if (!n?._id) return;
        setNotices(prev => prev.some(x => x._id === n._id)
            ? prev.map(x => x._id === n._id ? n : x)
            : (matchesFilter(n) ? [n, ...prev] : prev));
    });

    useSocketEvent("notice_deleted", d => {
        removeNotice(d?.noticeId || d?._id || d);
    });

    /* ─── Mutations ─────────────────────────────────────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault(); setPosting(true);
        try {
            if (editingId) {
                // UPDATE — apply the populated server response instantly,
                // no refetch required
                const res = await api.put(`/notices/${editingId}`, {
                    title: form.title,
                    content: form.content,
                    priority: form.priority,
                });
                const updated = res.data?.notice;
                if (updated?._id) {
                    setNotices(prev => prev.map(x => x._id === updated._id ? updated : x));
                }
                toast.success('Announcement updated — live for every member.');
                exitEdit();
                setShowForm(false);
            } else {
                // CREATE — prepend the returned notice immediately; the
                // socket broadcast covers everyone else
                const payload = { ...form };
                if (payload.targetType === 'ALL') { delete payload.classId; delete payload.subjectId; payload.targetRole = 'all'; }
                if (payload.targetType === 'ROLE') { delete payload.classId; delete payload.subjectId; }
                if (payload.targetType === 'CLASS') { delete payload.subjectId; payload.targetRole = 'all'; }
                if (payload.targetType === 'SUBJECT') { payload.targetRole = 'all'; }

                const res = await api.post('/notices/add', payload);
                toast.success('Announcement broadcast successfully!');
                setForm(p => ({ ...p, title: '', content: '', priority: 'medium', subjectId: '' }));
                setShowForm(false);
                const created = res.data?.notice;
                if (created?._id && matchesFilter(created)) upsertNotice(created);
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to post");
        }
        setPosting(false);
    };

    const handleDelete = async (n) => {
        if (!window.confirm('Delete this notice? It will disappear for all targeted members immediately.')) return;
        const snapshot = notices;
        setDeletingId(n._id);
        removeNotice(n._id); // optimistic removal
        try {
            await api.delete(`/notices/${n._id}`);
            toast.success('Notice removed everywhere.');
        } catch (err) {
            setNotices(snapshot); // rollback on failure
            toast.error(err.response?.data?.error || 'Failed to delete');
        }
        setDeletingId(null);
    };

    const startEdit = (n) => {
        setEditingId(n._id);
        setForm(p => ({ ...p, title: n.title || '', content: n.content || '', priority: n.priority || 'medium' }));
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const exitEdit = () => {
        setEditingId(null);
        setForm(p => ({ ...p, title: '', content: '', priority: 'medium' }));
    };

    const canPost = user?.role === 'teacher' || user?.role === 'admin';
    const canManage = (n) => !!user && (
        user.role === 'admin' ||
        String(n.createdBy?._id || n.createdBy || '') === String(user.id || '')
    );

    if (loading) return <Spinner label="Synchronizing bulletins…" />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <PageHeader
                title="Bulletin Board"
                subtitle="Official academic intelligence and administrative directives"
                accent={ACCENT}
                icon={Bell}
                right={
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {user?.role !== 'admin' && (
                            <Select accent={ACCENT} value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ width: 'auto', minWidth: 200, height: 48 }}>
                                <option value="">Global Broadcasts</option>
                                {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                            </Select>
                        )}
                        {canPost && (
                            <Btn accent={ACCENT} onClick={() => { if (showForm) exitEdit(); setShowForm(t => !t); }} style={{ height: 48, minWidth: 160 }}>
                                {showForm ? <X size={20} /> : <Send size={18} />} {showForm ? 'Abort' : 'Broadcast Notice'}
                            </Btn>
                        )}
                    </div>
                }
            />

            <div style={{ display: 'grid', gridTemplateColumns: showForm && canPost ? '1fr 1.5fr' : '1fr', gap: 32, alignItems: 'start' }}>
                {showForm && canPost && (
                    <Card accent={editingId ? '#fbbf24' : ACCENT} style={{ position: 'sticky', top: 32, animation: 'fadeUp 0.4s ease-out' }}>
                        <SectionTitle right={editingId ? <Badge color="#fbbf24">Editing Existing</Badge> : null}>
                            {editingId ? 'Revise Announcement' : 'Draft Announcement'}
                        </SectionTitle>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {!editingId && (
                                <>
                                    <div>
                                        <Label>Target Spectrum</Label>
                                        <Select accent={ACCENT} value={form.targetRole === 'teacher' && form.targetType === 'ROLE' ? 'TEACHERS' : form.targetRole === 'student' && form.targetType === 'ROLE' ? 'STUDENTS' : form.targetType}
                                            onChange={e => {
                                                const v = e.target.value;
                                                if (v === 'TEACHERS') setForm(p => ({ ...p, targetType: 'ROLE', targetRole: 'teacher', classId: '', subjectId: '' }));
                                                else if (v === 'STUDENTS') setForm(p => ({ ...p, targetType: 'ROLE', targetRole: 'student', classId: '', subjectId: '' }));
                                                else if (v === 'ALL') setForm(p => ({ ...p, targetType: 'ALL', targetRole: 'all', classId: '', subjectId: '' }));
                                                else setForm(p => ({ ...p, targetType: v, targetRole: 'all', classId: '', subjectId: '' }));
                                            }}>
                                            {user?.role === 'admin' ? (
                                                <>
                                                    <option value="ALL">Global (Collective)</option>
                                                    <option value="TEACHERS">Educators Only</option>
                                                    <option value="STUDENTS">Scholars Only</option>
                                                    <option value="CLASS">Specific Cohort</option>
                                                    <option value="SUBJECT">Curriculum Segment</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="CLASS">Managed Cohort</option>
                                                    <option value="SUBJECT">Assigned Curriculum</option>
                                                </>
                                            )}
                                        </Select>
                                    </div>

                                    {form.targetType === 'CLASS' && (
                                        <div><Label>Cohort Specification</Label>
                                            <Select accent={ACCENT} value={form.classId} onChange={e => setForm(p => ({ ...p, classId: e.target.value }))} required>
                                                <option value="">— Choose Cohort —</option>
                                                {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                            </Select>
                                        </div>
                                    )}
                                    {(form.targetType === 'SUBJECT' || (user?.role === 'admin' && form.targetType === 'SUBJECT')) && (
                                        <div><Label>Curriculum Specification</Label>
                                            <Select accent={ACCENT} value={form.subjectId} onChange={e => setForm(p => ({ ...p, subjectId: e.target.value }))} required>
                                                <option value="">— Choose Curriculum —</option>
                                                {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                                            </Select>
                                        </div>
                                    )}
                                </>
                            )}

                            <div><Label>Headline</Label><Input accent={ACCENT} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="The core message title" required /></div>
                            <div><Label>Directive Content</Label><Textarea accent={ACCENT} rows={8} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="In-depth details and directives…" required /></div>

                            <div>
                                <Label>Priority Signal</Label>
                                <Select accent={ACCENT} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                                    <option value="low">General</option>
                                    <option value="medium">Standard</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Critical</option>
                                </Select>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <Btn accent={editingId ? '#fbbf24' : ACCENT} type="submit" disabled={posting} full style={{ height: 52 }}>
                                    {posting ? <Loader2 size={20} className="animate-spin" /> : editingId ? <Pencil size={16} /> : <Send size={18} />}
                                    {posting ? 'Synchronizing…' : editingId ? 'Save Changes' : 'Finalize & Broadcast'}
                                </Btn>
                                {editingId && <Btn ghost onClick={() => { exitEdit(); setShowForm(false); }} style={{ height: 52 }}>Cancel</Btn>}
                            </div>
                        </form>
                    </Card>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 6, height: 24, borderRadius: 10, background: 'var(--c-primary)' }}></div>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', fontSize: '1.25rem', margin: 0 }}>Active Intelligence</h2>
                        </div>
                        <Badge color={ACCENT}>{notices.length} Recorded</Badge>
                    </div>

                    {notices.length === 0 ? (
                        <Card><Empty icon={Bell} title="System Silence" sub="Official directives will be captured and displayed here." /></Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {notices.map((n, i) => (
                                <Card key={n._id} style={{
                                    border: `1px solid var(--c-border)`,
                                    borderLeft: `6px solid ${P_COLOR[n.priority]?.text || 'var(--c-primary)'}`,
                                    animation: `fadeUp 0.4s ease-out ${i * 0.05}s`,
                                    animationFillMode: 'both'
                                }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-text)', lineHeight: 1.3, margin: 0 }}>{n.title}</h3>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {canManage(n) && (
                                                <>
                                                    <button onClick={() => startEdit(n)} title="Edit notice" aria-label="Edit notice" style={iconBtnStyle(false)}
                                                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--c-text)'; e.currentTarget.style.borderColor = 'var(--c-primary)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-muted)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}>
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(n)} disabled={deletingId === n._id} title="Delete notice" aria-label="Delete notice" style={iconBtnStyle(true)}
                                                        onMouseEnter={e => { if (deletingId !== n._id) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}>
                                                        {deletingId === n._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                    </button>
                                                </>
                                            )}
                                            <PriorityBadge p={n.priority} />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '1rem', color: 'var(--c-text)', opacity: 0.85, lineHeight: 1.7, marginBottom: 24, fontWeight: 500 }}>{n.content}</p>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, paddingTop: 16, borderTop: '1px solid var(--c-border)' }}>
                                        {n.createdBy?.name && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--c-muted)', fontWeight: 600 }}>
                                                <div style={{ width: 24, height: 24, borderRadius: 8, background: 'var(--c-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={12} />
                                                </div>
                                                {n.createdBy.name}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--c-muted)', fontWeight: 600 }}>
                                            <Clock size={14} /> {formatTimeAgo(n.createdAt)}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {n.targetType === 'ALL' && <Badge color="var(--c-primary)">GLOBAL</Badge>}
                                            {n.targetType === 'ROLE' && <Badge color="#8b5cf6">{n.targetRole?.toUpperCase()}</Badge>}
                                            {n.subjectId?.name && <Badge color="#fbbf24">{n.subjectId.name}</Badge>}
                                            {n.classId?.name && <Badge color="#34d399">{n.classId.name}</Badge>}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
