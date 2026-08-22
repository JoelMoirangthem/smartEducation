import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, Trash2, ChevronDown, Check, ChevronRight, Loader2, BookOpen, Layers } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';
const API = api.defaults.baseURL;
const ACCENT = '#10b981';

const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--c-input-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

export default function ManageAcademic() {
    const [step, setStep] = useState(1);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const [newClass, setNewClass] = useState({ name: '', code: '', academicYearId: '' });
    const [createdClass, setCreatedClass] = useState(null);
    const [newSubject, setNewSubject] = useState({ name: '', code: '', teacherId: '' });
    const [addedSubjects, setAddedSubjects] = useState([]);
    const [editingSub, setEditingSub] = useState(null);
    const [yearDropdown, setYearDropdown] = useState(false);
    const [saving, setSaving] = useState(false);
    const token = localStorage.getItem('token');
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => ({ _id: `${currentYear + i}`, name: `${currentYear + i}` }));

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [cRes, sRes] = await Promise.all([
                api.get('/admin/classes'), api.get('/admin/subjects'),
            ]);
            setClasses(cRes.data.classes || []);
            setSubjects(sRes.data.subjects || []);
        } catch { toast.error('Failed to load data'); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const createClass = async (e) => {
        e.preventDefault();
        if (!newClass.academicYearId) { toast.error('Select a year'); return; }
        setSaving(true);
        try {
            const selYear = years.find(y => y._id === newClass.academicYearId);
            const ayRes = await api.post('/admin/academic-years', { name: selYear.name, startDate: new Date(`${selYear.name}-01-01`), endDate: new Date(`${selYear.name}-12-31`), isCurrent: true });
            const res = await api.post('/admin/classes', { ...newClass, academicYearId: ayRes.data.academicYear._id });
            setCreatedClass(res.data.class); setStep(2);
            toast.success('Class created'); fetchData();
        } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
        setSaving(false);
    };

    const saveSubject = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            if (editingSub) {
                const res = await api.put(`/admin/subjects/${editingSub._id}`, newSubject);
                setAddedSubjects(p => p.map(s => s._id === editingSub._id ? res.data.subject : s));
                toast.success('Subject updated'); setEditingSub(null);
            } else {
                const res = await api.post('/admin/subjects', { ...newSubject, classId: createdClass._id });
                setAddedSubjects(p => [...p, res.data.subject]);
                toast.success('Subject added');
            }
            setNewSubject({ name: '', code: '', teacherId: '' });
        } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
        setSaving(false);
    };

    const deleteSubject = async (id) => {
        if (!confirm('Delete this subject?')) return;
        try { await api.delete(`/admin/subjects/${id}`); setAddedSubjects(p => p.filter(s => s._id !== id)); fetchData(); toast.info('Deleted'); } catch { toast.error('Failed'); }
    };

    const deleteClass = async (id) => {
        if (!confirm('Delete this class and all its subjects?')) return;
        try { await api.delete(`/admin/classes/${id}`); fetchData(); toast.info('Deleted'); } catch { toast.error('Failed'); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--c-muted)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>Academic Setup</h1>
                    <p style={{ color: 'var(--c-muted)', fontSize: '0.85rem', marginTop: 2 }}>Manage classes and subjects</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--c-surface)', padding: '4px 12px', borderRadius: 8, border: '1px solid var(--c-border)' }}>
                    {[{ n: 1, label: 'Classes' }, { n: 2, label: 'Subjects' }].map((s, i) => (
                        <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {i > 0 && <ChevronRight size={12} color="var(--c-muted)" />}
                            <div style={{
                                width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.7rem',
                                background: step > s.n ? '#10b98120' : step === s.n ? ACCENT : 'var(--c-bg)',
                                color: step >= s.n ? 'white' : 'var(--c-muted)',
                            }}>{step > s.n ? <Check size={12} color="#10b981" /> : s.n}</div>
                            <span style={{ fontSize: '0.75rem', color: step === s.n ? 'var(--c-text)' : 'var(--c-muted)', fontWeight: step === s.n ? 600 : 500 }}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, alignItems: 'start' }}>
                {/* Create Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {step === 1 ? (
                        <div style={{ padding: '20px', borderRadius: 14, background: 'var(--c-card-bg)', border: '1px solid var(--c-border)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px', color: 'var(--c-text)' }}>Create Class</h3>
                            <form onSubmit={createClass} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
                                    <input value={newClass.name} onChange={e => setNewClass(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Class 10-A" required style={{ ...inputStyle, marginTop: 4 }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Code</label>
                                    <input value={newClass.code} onChange={e => setNewClass(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. CLS-10A" required style={{ ...inputStyle, marginTop: 4 }} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Academic Year</label>
                                    <div onClick={() => setYearDropdown(t => !t)} style={{ ...inputStyle, marginTop: 4, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {newClass.academicYearId ? years.find(y => y._id === newClass.academicYearId)?.name : 'Select year'}
                                        <ChevronDown size={14} color="var(--c-muted)" style={{ transform: yearDropdown ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
                                    </div>
                                    {yearDropdown && (
                                        <div style={{ position: 'absolute', zIndex: 100, width: '100%', background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
                                            {years.map(y => (
                                                <div key={y._id} onClick={() => { setNewClass(p => ({ ...p, academicYearId: y._id })); setYearDropdown(false); }}
                                                    style={{ padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', background: newClass.academicYearId === y._id ? ACCENT + '15' : 'transparent', color: newClass.academicYearId === y._id ? ACCENT : 'var(--c-text)' }}
                                                >{y.name}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button type="submit" disabled={saving} style={{
                                    padding: '10px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                                    background: ACCENT, color: 'white', fontWeight: 600, fontSize: '0.85rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}>
                                    {saving ? 'Creating…' : <><ChevronRight size={16} /> Create Class</>}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div style={{ padding: '20px', borderRadius: 14, background: 'var(--c-card-bg)', border: '1px solid var(--c-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <Layers size={16} color={ACCENT} />
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--c-text)' }}>Add Subjects: {createdClass?.name}</h3>
                            </div>
                            <form onSubmit={saveSubject} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <input placeholder="Subject name" value={newSubject.name} onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))} required style={inputStyle} />
                                <input placeholder="Subject code" value={newSubject.code} onChange={e => setNewSubject(p => ({ ...p, code: e.target.value.toUpperCase() }))} required style={inputStyle} />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" disabled={saving} style={{
                                        flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                                        background: ACCENT, color: 'white', fontWeight: 600, fontSize: '0.8rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                    }}>
                                        {saving ? 'Saving…' : <><Plus size={14} /> Add Subject</>}
                                    </button>
                                    {editingSub && <button type="button" onClick={() => { setEditingSub(null); setNewSubject({ name: '', code: '' }); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-muted)', fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>}
                                </div>
                            </form>
                            {addedSubjects.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Subjects ({addedSubjects.length})</p>
                                    {addedSubjects.map(s => (
                                        <div key={s._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--c-surface)', border: '1px solid var(--c-border)', marginBottom: 6 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <BookOpen size={14} color={ACCENT} />
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-text)' }}>{s.name}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--c-muted)' }}>{s.code}</span>
                                            </div>
                                            <button onClick={() => deleteSubject(s._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button onClick={() => { setStep(1); setNewClass({ name: '', code: '', academicYearId: '' }); setAddedSubjects([]); setCreatedClass(null); fetchData(); }} style={{ width: '100%', marginTop: 12, padding: '8px', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--c-muted)', fontWeight: 600 }}>
                                Done — Back to Classes
                            </button>
                        </div>
                    )}
                </div>

                {/* Class List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--c-text)' }}>Classes</h3>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', background: 'var(--c-surface)', padding: '3px 10px', borderRadius: 8 }}>{classes.length}</span>
                    </div>
                    {classes.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-muted)', fontSize: '0.85rem' }}>No classes yet</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {classes.map(cls => {
                                const clsSubjects = subjects.filter(s => s.classId?._id === cls._id);
                                const isExpanded = expanded[cls._id];
                                return (
                                    <div key={cls._id} style={{ borderRadius: 12, background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
                                        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }} onClick={() => { setExpanded(p => ({ ...p, [cls._id]: !isExpanded })); setCreatedClass(cls); setStep(2); setAddedSubjects(clsSubjects); }}>
                                                <Layers size={16} color={ACCENT} />
                                                <div>
                                                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--c-text)', margin: 0 }}>{cls.name}</p>
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--c-muted)', margin: 0 }}>{cls.code} · {clsSubjects.length} subjects</p>
                                                </div>
                                            </div>
                                            <button onClick={() => deleteClass(cls._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}
