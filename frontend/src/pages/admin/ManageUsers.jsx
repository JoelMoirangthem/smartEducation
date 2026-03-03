import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Search, Edit2, Shield, User, Check, X, UserPlus,
    Mail, Lock, Loader2, Users, GraduationCap,
    Briefcase, Calendar, MoreVertical, Filter, ChevronRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Card, PageHeader, Spinner, Btn, Label, Input, Select, SectionTitle, Badge } from '../../components/PageLayout';

const API = 'http://localhost:5000/api/v1';
const ACCENT = '#6366f1';

/* --- Side Drawer Component (Modern SaaS Feel) --- */
const Drawer = ({ isOpen, onClose, title, children }) => {
    return (
        <>
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none',
                transition: 'opacity 0.3s ease'
            }} onClick={onClose} />
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
                width: '100%', maxWidth: 500, background: 'var(--c-card-bg)',
                borderLeft: '1px solid var(--c-border)',
                transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 32,
                boxShadow: '-20px 0 50px rgba(0,0,0,0.5)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--c-text)', margin: 0 }}>{title}</h2>
                        <p style={{ color: 'var(--c-muted)', fontSize: '0.8rem', marginTop: 4 }}>Configure academic profile & access levels</p>
                    </div>
                    <button onClick={onClose} style={{ cursor: 'pointer', background: 'var(--c-surface-hover)', border: '1px solid var(--c-border)', color: 'var(--c-text)', padding: 10, borderRadius: 12 }}><X size={20} /></button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                    {children}
                </div>
            </div>
        </>
    );
};

/* --- Member Card Interface --- */
const MemberCard = ({ user, onEdit, accent }) => {
    const isTeacher = user.role === 'teacher';
    const isAdmin = user.role === 'admin';
    const avatarColor = isAdmin ? '#f87171' : isTeacher ? '#a78bfa' : '#34d399';

    return (
        <Card noPad style={{
            transition: 'transform 0.2s, border-color 0.2s',
            cursor: 'default',
            border: '1px solid var(--c-border)',
            background: 'var(--c-card-bg)'
        }} onMouseEnter={e => e.currentTarget.style.borderColor = accent + '40'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border)'}>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Header: Identity */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 14 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: 16,
                            background: avatarColor + '15', border: `1px solid ${avatarColor}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.2rem', fontWeight: 800, color: avatarColor, flexShrink: 0
                        }}>
                            {user.name?.charAt(0)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <h4 style={{ color: 'var(--c-text)', fontSize: '1rem', fontWeight: 700, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Badge color={avatarColor}>{user.role}</Badge>
                                {user.academicYearId && <span style={{ fontSize: '0.65rem', color: 'var(--c-muted)', fontWeight: 600 }}>ID: {user._id.slice(-4).toUpperCase()}</span>}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => onEdit(user)} style={{
                        width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)', color: 'white', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                    }} onMouseEnter={e => e.currentTarget.style.background = accent + '20'}>
                        <Edit2 size={14} />
                    </button>
                </div>

                {/* Portfolio Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <GraduationCap size={14} color="rgba(255,255,255,0.2)" />
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                            {isTeacher
                                ? user.managedClasses?.length > 0 ? `Manages ${user.managedClasses.length} Classes` : 'Unassigned Class'
                                : user.classId?.name || 'Academic Batch Pending'
                            }
                        </span>
                    </div>

                    {isTeacher && user.assignedSubjects?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {user.assignedSubjects.slice(0, 3).map(s => (
                                <span key={s._id} style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>{s.name}</span>
                            ))}
                            {user.assignedSubjects.length > 3 && <span style={{ fontSize: '0.65rem', color: accent }}>+{user.assignedSubjects.length - 3} more</span>}
                        </div>
                    )}
                </div>

                {/* Footer: Meta */}
                <div style={{
                    marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={12} color="rgba(255,255,255,0.2)" />
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{user.email}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default function ManageUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState('all');
    const [search, setSearch] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
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

    const fetchUsers = async () => { try { const r = await axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }); setUsers(r.data); } catch { } setLoading(false); };
    const fetchClasses = async () => { try { const r = await axios.get(`${API}/admin/classes`, { headers: { Authorization: `Bearer ${token}` } }); setClassList(r.data.classes || []); } catch { } };
    const fetchSubjects = async (cid) => {
        try {
            const params = cid && cid !== 'all' ? { classId: cid } : {};
            const r = await axios.get(`${API}/admin/subjects`, { params, headers: { Authorization: `Bearer ${token}` } });
            setSubjectList(r.data.subjects || []);
        } catch { }
    };
    const fetchYears = async () => { try { const r = await axios.get(`${API}/admin/academic-years`, { headers: { Authorization: `Bearer ${token}` } }); setYearList(r.data.academicYears || []); } catch { } };

    useEffect(() => { fetchUsers(); fetchClasses(); fetchYears(); }, []);

    const handleUpdate = async (id) => {
        setSaving(true);
        try {
            await axios.put(`${API}/admin/users/${id}/update-academic`, {
                name: editName,
                email: editEmail,
                role: selRole,
                classIds: selClassIds,
                subjectIds: selSubjectIds,
                classId: selClassIds[0] || null
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Member profile updated');
            fetchUsers();
            setEditingUser(null);
        } catch (e) { toast.error(e.response?.data?.message || 'Update failed'); }
        setSaving(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            await axios.post(`${API}/auth/admin/create-user`, newUser, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`${newUser.role} registered successfully`); setShowAdd(false);
            setNewUser({ name: '', email: '', password: '', role: 'student', classId: '', subjectIds: [], academicYearId: '' });
            fetchUsers();
        } catch (e) { toast.error(e.response?.data?.message || 'Registration failed'); }
        setSaving(false);
    };

    const filtered = users.filter(u => {
        const matchRole = filterRole === 'all' || u.role === filterRole;
        const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
        return matchRole && matchSearch;
    });

    const stats = {
        total: users.length,
        teachers: users.filter(u => u.role === 'teacher').length,
        students: users.filter(u => u.role === 'student').length
    };

    if (loading) return <Spinner label="Waking up system registry…" />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 60 }}>
            <PageHeader
                title="Member Directory"
                subtitle="High-level orchestration of institution staff and students"
                accent={ACCENT}
                icon={Users}
            />

            {/* Quick Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                {[
                    { label: 'Total Accounts', val: stats.total, icon: Users, color: ACCENT },
                    { label: 'Active Teachers', val: stats.teachers, icon: Briefcase, color: '#a78bfa' },
                    { label: 'Enrolled Students', val: stats.students, icon: GraduationCap, color: '#34d399' }
                ].map((s, i) => (
                    <Card key={i} accent={s.color} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                        <div style={{
                            width: 50, height: 50, borderRadius: 14, background: s.color + '15',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <s.icon size={24} color={s.color} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{s.label}</p>
                            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--c-text)', margin: 0 }}>{s.val}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Advanced Control Bar */}
            <Card style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
                    <input
                        type="text" placeholder="Search the directorate by name or email…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '12px 16px 12px 42px', borderRadius: 14,
                            background: 'var(--c-bg)', border: '1px solid var(--c-border)',
                            color: 'var(--c-text)', fontSize: '0.9rem', outline: 'none'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', background: 'var(--c-bg)', padding: 4, borderRadius: 12, border: '1px solid var(--c-border)' }}>
                    {['all', 'teacher', 'student', 'admin'].map(r => (
                        <button key={r} onClick={() => setFilterRole(r)} style={{
                            padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                            textTransform: 'capitalize', transition: 'all 0.2s', border: 'none',
                            background: filterRole === r ? ACCENT : 'transparent',
                            color: filterRole === r ? 'white' : 'var(--c-muted)'
                        }}>{r}</button>
                    ))}
                </div>
                <Btn accent={ACCENT} onClick={() => setShowAdd(true)} style={{ height: 46, padding: '0 24px' }}>
                    <UserPlus size={18} /> Register Member
                </Btn>
            </Card>

            {/* Member Registry Grid */}
            {filtered.length === 0 ? (
                <Card style={{ padding: '80px 0', textAlign: 'center', opacity: 0.5 }}>
                    <Users size={40} style={{ margin: '0 auto 16px', display: 'block' }} />
                    <p>No members found matching your current filters</p>
                </Card>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 20
                }}>
                    {filtered.map(u => (
                        <MemberCard
                            key={u._id}
                            user={u}
                            accent={ACCENT}
                            onEdit={(user) => {
                                setEditingUser(user);
                                setEditName(user.name);
                                setEditEmail(user.email);
                                setSelRole(user.role);
                                const currentManagedIds = user.managedClasses?.map(c => c._id) || [];
                                setSelClassIds(currentManagedIds.length > 0 ? currentManagedIds : (user.classId?._id ? [user.classId._id] : []));
                                setSelSubjectIds(user.assignedSubjects?.map(s => s._id) || []);
                                fetchSubjects('all');
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Add Member Slider */}
            <Drawer isOpen={showAdd} onClose={() => setShowAdd(false)} title="Register New Member">
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div>
                        <Label>Role Assignment</Label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                            {['student', 'teacher', 'admin'].map(r => (
                                <button key={r} type="button" onClick={() => setNewUser(p => ({ ...p, role: r, classId: '', subjectIds: [] }))} style={{
                                    padding: '12px', borderRadius: 12, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                                    textTransform: 'capitalize', border: `1px solid ${newUser.role === r ? ACCENT : 'rgba(255,255,255,0.08)'}`,
                                    background: newUser.role === r ? ACCENT + '20' : 'transparent',
                                    color: newUser.role === r ? 'white' : 'rgba(255,255,255,0.3)', transition: 'all 0.2s'
                                }}>{r}</button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ position: 'relative' }}>
                            <Label>Full Identity</Label>
                            <Input accent={ACCENT} placeholder="Real name" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} required />
                        </div>
                        <div>
                            <Label>Official Email</Label>
                            <Input accent={ACCENT} type="email" placeholder="email@institution.edu" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} required />
                        </div>
                        <div>
                            <Label>Access Secret (Password)</Label>
                            <Input accent={ACCENT} type="password" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} required />
                        </div>
                    </div>

                    {(newUser.role === 'student' || newUser.role === 'teacher') && (
                        <div>
                            <Label>{newUser.role === 'teacher' ? 'Class Designation' : 'Batch/Section'}</Label>
                            <Select accent={ACCENT} value={newUser.classId} onChange={e => { setNewUser(p => ({ ...p, classId: e.target.value, subjectIds: [] })); fetchSubjects(e.target.value); }} required>
                                <option value="">— Primary placement —</option>
                                {classList.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
                            </Select>
                        </div>
                    )}

                    {newUser.role === 'teacher' && newUser.classId && (
                        <div>
                            <SectionTitle>Curriculum Focus</SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                                {subjectList.map(s => (
                                    <div key={s._id} onClick={() => {
                                        const current = newUser.subjectIds || [];
                                        const next = current.includes(s._id) ? current.filter(id => id !== s._id) : [...current, s._id];
                                        setNewUser(p => ({ ...p, subjectIds: next }));
                                    }} style={{
                                        padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                                        background: newUser.subjectIds.includes(s._id) ? `${ACCENT}20` : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${newUser.subjectIds.includes(s._id) ? ACCENT : 'rgba(255,255,255,0.06)'}`,
                                        color: newUser.subjectIds.includes(s._id) ? 'white' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s'
                                    }}>{s.name}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {newUser.role === 'student' && (
                        <div>
                            <Label>Academic Session</Label>
                            <Select accent={ACCENT} value={newUser.academicYearId} onChange={e => setNewUser(p => ({ ...p, academicYearId: e.target.value }))} required>
                                <option value="">— Select active session —</option>
                                {yearList.map(y => <option key={y._id} value={y._id}>{y.name}{y.isCurrent ? ' (Active)' : ''}</option>)}
                            </Select>
                        </div>
                    )}

                    <Btn accent={ACCENT} type="submit" full disabled={saving} style={{ marginTop: 12, height: 50 }}>
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                        Confirm Registration
                    </Btn>
                </form>
            </Drawer>

            {/* Edit Member Drawer */}
            <Drawer isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Manage Profile">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px', borderRadius: 20, background: 'var(--c-surface-hover)', border: '1px solid var(--c-border)' }}>
                        <div style={{ width: 60, height: 60, borderRadius: 20, background: ACCENT + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: ACCENT }}>{editingUser?.name?.charAt(0)}</div>
                        <div>
                            <h4 style={{ color: 'var(--c-text)', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{editingUser?.name}</h4>
                            <p style={{ color: 'var(--c-muted)', fontSize: '0.82rem', margin: 0 }}>{editingUser?.email}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div>
                            <Label>Full Identity</Label>
                            <Input accent={ACCENT} placeholder="Real name" value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div>
                            <Label>Official Email</Label>
                            <Input accent={ACCENT} type="email" placeholder="email@institution.edu" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                        </div>
                        <div>
                            <Label>Access Role</Label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                {['student', 'teacher', 'admin'].map(r => (
                                    <button key={r} onClick={() => setSelRole(r)} style={{
                                        padding: '12px', borderRadius: 12, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                                        textTransform: 'capitalize', border: `1px solid ${selRole === r ? ACCENT : 'rgba(255,255,255,0.08)'}`,
                                        background: selRole === r ? ACCENT + '20' : 'transparent',
                                        color: selRole === r ? 'white' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s'
                                    }}>{r}</button>
                                ))}
                            </div>
                        </div>

                        {selRole === 'teacher' && (
                            <>
                                <div>
                                    <SectionTitle>Department / Classes</SectionTitle>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {classList.map(c => (
                                            <button key={c._id} onClick={() => setSelClassIds(p => p.includes(c._id) ? p.filter(id => id !== c._id) : [...p, c._id])} style={{
                                                padding: '10px 18px', borderRadius: 14, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                                                background: selClassIds.includes(c._id) ? `${ACCENT}25` : 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${selClassIds.includes(c._id) ? ACCENT : 'rgba(255,255,255,0.06)'}`,
                                                color: selClassIds.includes(c._id) ? 'white' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s'
                                            }}>{c.name}</button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <SectionTitle>Subject Expertise</SectionTitle>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                                        {subjectList.map(s => (
                                            <div key={s._id} onClick={() => setSelSubjectIds(p => p.includes(s._id) ? p.filter(id => id !== s._id) : [...p, s._id])} style={{
                                                padding: '14px', borderRadius: 16, cursor: 'pointer', background: 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${selSubjectIds.includes(s._id) ? ACCENT : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s'
                                            }}>
                                                <div style={{ width: 20, height: 20, borderRadius: 6, background: selSubjectIds.includes(s._id) ? ACCENT : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {selSubjectIds.includes(s._id) && <Check size={12} color="white" />}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: selSubjectIds.includes(s._id) ? 'white' : 'rgba(255,255,255,0.5)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</p>
                                                    <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', margin: 0 }}>{s.classId?.name}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {selRole === 'student' && (
                            <div>
                                <Label>Assigned Batch</Label>
                                <Select accent={ACCENT} value={selClassIds[0] || ""} onChange={e => setSelClassIds([e.target.value])}>
                                    <option value="">— Relocate student —</option>
                                    {classList.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </Select>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                        <Btn ghost full onClick={() => setEditingUser(null)}>Cancel</Btn>
                        <Btn full onClick={() => handleUpdate(editingUser?._id)} disabled={saving}>
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Update Profile
                        </Btn>
                    </div>
                </div>
            </Drawer>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}
