import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Edit2, UserPlus, Mail, Loader2, X, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';
const API = api.defaults.baseURL;
const ACCENT = '#6366f1';

const Drawer = ({ isOpen, onClose, title, children }) => (
    <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none', transition: 'opacity 0.2s' }} onClick={onClose} />
        <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
            width: '100%', maxWidth: 420, background: 'var(--c-card-bg)',
            borderLeft: '1px solid var(--c-border)',
            transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.25s ease',
            padding: '24px', display: 'flex', flexDirection: 'column', gap: 20,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--c-text)' }}>{title}</h2>
                <button onClick={onClose} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--c-muted)', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
        </div>
    </>
);

const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--c-input-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

export default function ManageUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState('all');
    const [search, setSearch] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [selRole, setSelRole] = useState('');
    const [selClassIds, setSelClassIds] = useState([]);
    const [selSubjectIds, setSelSubjectIds] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [classList, setClassList] = useState([]);
    const [subjectList, setSubjectList] = useState([]);
    const [yearList, setYearList] = useState([]);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'student', classId: '', subjectIds: [], academicYearId: '' });
    const [saving, setSaving] = useState(false);
    const token = localStorage.getItem('token');

    useEffect(() => {
        Promise.all([
            api.get('/admin/users'),
            api.get('/admin/classes'),
            api.get('/admin/academic-years'),
        ]).then(([uR, cR, yR]) => {
            setUsers(uR.data);
            setClassList(cR.data.classes || []);
            setYearList(yR.data.academicYears || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const fetchSubjects = async (cid) => {
        try {
            const params = cid && cid !== 'all' ? { classId: cid } : {};
            const r = await api.get('/admin/subjects', { params });
            setSubjectList(r.data.subjects || []);
        } catch { /* ignore */ }
    };

    const handleUpdate = async (id) => {
        setSaving(true);
        try {
            await api.put(`/admin/users/${id}/update-academic`, {
                name: editName, email: editEmail, role: selRole,
                classIds: selClassIds, subjectIds: selSubjectIds,
                classId: selClassIds[0] || null, password: editPassword || undefined
            });
            toast.success('User updated');
            fetchUsers();
            setEditingUser(null);
        } catch (e) { toast.error(e.response?.data?.message || 'Update failed'); }
        setSaving(false);
    };

    const fetchUsers = async () => {
        try { const r = await api.get('/admin/users'); setUsers(r.data); } catch { /* ignore */ }
    };

    const handleCreate = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            await api.post('/auth/admin/create-user', newUser);
            toast.success(`${newUser.role} created`);
            setShowAdd(false);
            setNewUser({ name: '', email: '', password: '', role: 'student', classId: '', subjectIds: [], academicYearId: '' });
            fetchUsers();
        } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
        setSaving(false);
    };

    const filtered = users.filter(u => {
        const matchRole = filterRole === 'all' || u.role === filterRole;
        const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
        return matchRole && matchSearch;
    });

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--c-muted)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>Users</h1>
                    <p style={{ color: 'var(--c-muted)', fontSize: '0.85rem', marginTop: 2 }}>{users.length} total</p>
                </div>
                <button onClick={() => setShowAdd(true)} style={{
                    padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: ACCENT, color: 'white', fontWeight: 600, fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', gap: 6,
                }}><UserPlus size={14} /> Add User</button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
                    <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 34 }} />
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    {['all', 'teacher', 'student', 'admin'].map(r => (
                        <button key={r} onClick={() => setFilterRole(r)} style={{
                            padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                            textTransform: 'capitalize', border: 'none',
                            background: filterRole === r ? ACCENT : 'var(--c-surface)',
                            color: filterRole === r ? 'white' : 'var(--c-muted)',
                        }}>{r}</button>
                    ))}
                </div>
            </div>

            {/* User List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {filtered.map(u => (
                    <div key={u._id} style={{
                        padding: '16px', borderRadius: 12,
                        background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: u.role === 'admin' ? '#f43f5e15' : u.role === 'teacher' ? '#06b6d415' : '#6366f115',
                                color: u.role === 'admin' ? '#f43f5e' : u.role === 'teacher' ? '#06b6d4' : '#6366f1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                            }}>{u.name?.charAt(0)}</div>
                            <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--c-muted)', margin: 0 }}>{u.role} · {u.email}</p>
                            </div>
                        </div>
                        <button onClick={() => {
                            setEditingUser(u); setEditName(u.name); setEditEmail(u.email); setSelRole(u.role); setEditPassword('');
                            setSelClassIds(u.managedClasses?.map(c => c._id) || (u.classId?._id ? [u.classId._id] : []));
                            setSelSubjectIds(u.assignedSubjects?.map(s => s._id) || []);
                            fetchSubjects('all');
                        }} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)', padding: 6 }}>
                            <Edit2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add Drawer */}
            <Drawer isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add User">
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</label>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            {['student', 'teacher'].map(r => (
                                <button key={r} type="button" onClick={() => setNewUser(p => ({ ...p, role: r, classId: '' }))} style={{
                                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                                    textTransform: 'capitalize', border: `1px solid ${newUser.role === r ? ACCENT : 'var(--c-border)'}`,
                                    background: newUser.role === r ? ACCENT + '15' : 'transparent',
                                    color: newUser.role === r ? ACCENT : 'var(--c-muted)',
                                }}>{r}</button>
                            ))}
                        </div>
                    </div>
                    <input placeholder="Name" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} required style={inputStyle} />
                    <input placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} required style={inputStyle} />
                    <input placeholder="Password (min 6 chars)" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} required style={inputStyle} />
                    <select value={newUser.classId} onChange={e => { setNewUser(p => ({ ...p, classId: e.target.value })); fetchSubjects(e.target.value); }} style={inputStyle}>
                        <option value="">Select class</option>
                        {classList.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    {newUser.role === 'teacher' && newUser.classId && (
                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subjects</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                {subjectList.map(s => (
                                    <button key={s._id} type="button" onClick={() => {
                                        const current = newUser.subjectIds || [];
                                        setNewUser(p => ({ ...p, subjectIds: current.includes(s._id) ? current.filter(id => id !== s._id) : [...current, s._id] }));
                                    }} style={{
                                        padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                                        background: newUser.subjectIds.includes(s._id) ? ACCENT + '20' : 'var(--c-surface)',
                                        border: `1px solid ${newUser.subjectIds.includes(s._id) ? ACCENT : 'var(--c-border)'}`,
                                        color: newUser.subjectIds.includes(s._id) ? ACCENT : 'var(--c-muted)',
                                    }}>{s.name}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    <button type="submit" disabled={saving} style={{
                        padding: '10px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                        background: ACCENT, color: 'white', fontWeight: 600, fontSize: '0.85rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8,
                    }}>
                        {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={16} />}
                        {saving ? 'Creating…' : 'Create User'}
                    </button>
                </form>
            </Drawer>

            {/* Edit Drawer */}
            <Drawer isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 12, background: 'var(--c-surface)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: ACCENT }}>{editingUser?.name?.charAt(0)}</div>
                        <div>
                            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--c-text)', margin: 0 }}>{editingUser?.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--c-muted)', margin: 0 }}>{editingUser?.email}</p>
                        </div>
                    </div>
                    <input placeholder="Name" value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />
                    <input placeholder="Email" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={inputStyle} />
                    <input placeholder="New password (blank = keep)" type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} style={inputStyle} />
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</label>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            {['student', 'teacher', 'admin'].map(r => (
                                <button key={r} type="button" onClick={() => setSelRole(r)} style={{
                                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                                    textTransform: 'capitalize', border: `1px solid ${selRole === r ? ACCENT : 'var(--c-border)'}`,
                                    background: selRole === r ? ACCENT + '15' : 'transparent',
                                    color: selRole === r ? ACCENT : 'var(--c-muted)',
                                }}>{r}</button>
                            ))}
                        </div>
                    </div>
                    {selRole === 'teacher' && (
                        <>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Classes</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                    {classList.map(c => (
                                        <button key={c._id} type="button" onClick={() => setSelClassIds(p => p.includes(c._id) ? p.filter(id => id !== c._id) : [...p, c._id])} style={{
                                            padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                                            background: selClassIds.includes(c._id) ? ACCENT + '20' : 'var(--c-surface)',
                                            border: `1px solid ${selClassIds.includes(c._id) ? ACCENT : 'var(--c-border)'}`,
                                            color: selClassIds.includes(c._id) ? ACCENT : 'var(--c-muted)',
                                        }}>{c.name}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subjects</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                    {subjectList.map(s => (
                                        <button key={s._id} type="button" onClick={() => setSelSubjectIds(p => p.includes(s._id) ? p.filter(id => id !== s._id) : [...p, s._id])} style={{
                                            padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                                            background: selSubjectIds.includes(s._id) ? ACCENT + '20' : 'var(--c-surface)',
                                            border: `1px solid ${selSubjectIds.includes(s._id) ? ACCENT : 'var(--c-border)'}`,
                                            color: selSubjectIds.includes(s._id) ? ACCENT : 'var(--c-muted)',
                                        }}>{s.name}</button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    {selRole === 'student' && (
                        <select value={selClassIds[0] || ""} onChange={e => setSelClassIds([e.target.value])} style={inputStyle}>
                            <option value="">Select class</option>
                            {classList.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-text)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => handleUpdate(editingUser?._id)} disabled={saving} style={{
                            flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            background: ACCENT, color: 'white', fontWeight: 600, fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                            {saving ? 'Saving…' : <><Check size={16} /> Save</>}
                        </button>
                    </div>
                </div>
            </Drawer>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}
