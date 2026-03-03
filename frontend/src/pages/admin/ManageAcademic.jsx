import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Plus, Trash2, Book, Layers, ChevronDown, ChevronUp,
    Check, ChevronRight, Loader2, BookOpen, Layout,
    GraduationCap, Calendar, Zap, MoreHorizontal
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getSocket } from '../../services/socket.service';
import { Card, PageHeader, Spinner, Btn, Label, Input, Select, SectionTitle, Empty, Badge } from '../../components/PageLayout';

const API = 'http://localhost:5000/api/v1/admin';
const ACCENT = '#10b981';

/* --- Premium Subject Item --- */
const SubjectPill = ({ subject, onDelete, onEdit, accent }) => (
    <div style={{
        padding: '12px 16px', borderRadius: 16, background: 'var(--c-surface-hover)',
        border: '1px solid var(--c-border)', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.2s'
    }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-surface)'; e.currentTarget.style.borderColor = accent + '30'; }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: accent + '10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
                <BookOpen size={16} />
            </div>
            <div>
                <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>{subject.name}</p>
                <p style={{ fontSize: '0.65rem', color: 'var(--c-muted)', margin: 0, fontFamily: 'Space Grotesk, sans-serif' }}>{subject.code}</p>
            </div>
        </div>
        <button onClick={() => onDelete(subject._id)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
            <Trash2 size={12} />
        </button>
    </div>
);

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
    const years = Array.from({ length: 15 }, (_, i) => ({ _id: `${currentYear + i}`, name: `${currentYear + i}` }));

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cRes, sRes] = await Promise.all([
                axios.get(`${API}/classes`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API}/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setClasses(cRes.data.classes || []);
            setSubjects(sRes.data.subjects || []);
        } catch { toast.error('Shielded data access failed'); }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        const socket = getSocket();
        if (socket) {
            const h = () => fetchData();
            ['CLASS_CREATED', 'CLASS_DELETED', 'SUBJECT_CREATED', 'SUBJECT_UPDATED', 'SUBJECT_DELETED'].forEach(e => socket.on(e, h));
            return () => ['CLASS_CREATED', 'CLASS_DELETED', 'SUBJECT_CREATED', 'SUBJECT_UPDATED', 'SUBJECT_DELETED'].forEach(e => socket.off(e, h));
        }
    }, []);

    const createClass = async (e) => {
        e.preventDefault();
        if (!newClass.academicYearId) { toast.error('Please select an active session'); return; }
        setSaving(true);
        try {
            const selYear = years.find(y => y._id === newClass.academicYearId);
            const ayRes = await axios.post(`${API}/academic-years`, {
                name: selYear.name,
                startDate: new Date(`${selYear.name}-01-01`),
                endDate: new Date(`${selYear.name}-12-31`),
                isCurrent: true
            }, { headers: { Authorization: `Bearer ${token}` } });
            const ayId = ayRes.data.academicYear._id;
            const res = await axios.post(`${API}/classes`, { ...newClass, academicYearId: ayId }, { headers: { Authorization: `Bearer ${token}` } });
            setCreatedClass(res.data.class); setStep(2);
            toast.success('Sector defined. Add curriculum units.');
            fetchData();
        } catch (e) { toast.error(e.response?.data?.message || 'Sector definition failed'); }
        setSaving(false);
    };

    const saveSubject = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            if (editingSub) {
                const res = await axios.put(`${API}/subjects/${editingSub._id}`, newSubject, { headers: { Authorization: `Bearer ${token}` } });
                setAddedSubjects(p => p.map(s => s._id === editingSub._id ? res.data.subject : s));
                toast.success('Curriculum unit updated'); setEditingSub(null);
            } else {
                const res = await axios.post(`${API}/subjects`, { ...newSubject, classId: createdClass._id }, { headers: { Authorization: `Bearer ${token}` } });
                setAddedSubjects(p => [...p, res.data.subject]);
                toast.success(`Unit added to ${createdClass.name}`);
            }
            setNewSubject({ name: '', code: '', teacherId: '' });
        } catch (e) { toast.error(e.response?.data?.message || 'Unit sync failed'); }
        setSaving(false);
    };

    const deleteSubject = async (id) => {
        if (!confirm('Purge this unit from database?')) return;
        try {
            await axios.delete(`${API}/subjects/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setAddedSubjects(p => p.filter(s => s._id !== id)); toast.info('Unit purged');
            fetchData();
        } catch { toast.error('Purge sequence failed'); }
    };

    const deleteClass = async (id) => {
        if (!confirm('Wipe this entire class sector?')) return;
        try { await axios.delete(`${API}/classes/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); toast.info('Sector wiped'); }
        catch { toast.error('Wipe sequence failed'); }
    };

    const finish = () => { setStep(1); setNewClass({ name: '', code: '', academicYearId: '' }); setAddedSubjects([]); setCreatedClass(null); fetchData(); };
    const openForClass = (cls) => { setCreatedClass(cls); setStep(2); setAddedSubjects(subjects.filter(s => s.classId?._id === cls._id)); };

    if (loading) return <Spinner label="Calibrating academic registry…" />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 60 }}>
            <PageHeader
                title="Academic Architect"
                subtitle="Design and deploy your institution's structural sectors"
                accent={ACCENT}
                icon={Layout}
                right={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--c-surface-hover)', padding: '6px 16px', borderRadius: 20, border: '1px solid var(--c-border)' }}>
                        {[{ n: 1, label: 'Sector Definition' }, { n: 2, label: 'Curriculum Load' }].map((s, i) => (
                            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {i > 0 && <ChevronRight size={16} color="var(--c-muted)" />}
                                <div style={{
                                    width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: '0.8rem',
                                    background: step > s.n ? '#10b98120' : step === s.n ? ACCENT : 'var(--c-bg)',
                                    color: step >= s.n ? 'white' : 'var(--c-muted)',
                                    border: `1px solid ${step === s.n ? ACCENT : 'var(--c-border)'}`, transition: 'all 0.3s'
                                }}>{step > s.n ? <Check size={16} color="#10b981" /> : s.n}</div>
                                <span style={{ fontSize: '0.75rem', color: step === s.n ? 'var(--c-text)' : 'var(--c-muted)', fontWeight: step === s.n ? 700 : 500 }}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                }
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 32, alignItems: 'start' }}>

                {/* Architect Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Zap size={20} color={ACCENT} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-text)', margin: 0, fontFamily: 'Space Grotesk, sans-serif' }}>Forge Panel</h3>
                    </div>

                    {step === 1 && (
                        <Card accent={ACCENT} style={{ padding: 32 }}>
                            <SectionTitle>Primary Class Sector</SectionTitle>
                            <form onSubmit={createClass} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div><Label>Designation Name</Label><Input accent={ACCENT} value={newClass.name} onChange={e => setNewClass(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Science Ops 10-A" required /></div>
                                <div><Label>System Code</Label><Input accent={ACCENT} value={newClass.code} onChange={e => setNewClass(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. SC-10A" required /></div>
                                <div style={{ position: 'relative' }}>
                                    <Label>Operational Cycle</Label>
                                    <div onClick={() => setYearDropdown(t => !t)} style={{ padding: '12px 16px', borderRadius: 14, background: 'var(--c-bg)', border: '1px solid var(--c-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: newClass.academicYearId ? 'var(--c-text)' : 'var(--c-muted)', fontSize: '0.9rem', transition: 'all 0.2s' }}>
                                        {newClass.academicYearId ? years.find(y => y._id === newClass.academicYearId)?.name : 'Select Cycle'}
                                        <ChevronDown size={18} color="var(--c-muted)" style={{ transform: yearDropdown ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
                                    </div>
                                    {yearDropdown && (
                                        <div style={{ position: 'absolute', zIndex: 100, width: '100%', background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 14, marginTop: 8, maxHeight: 220, overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', padding: 6 }}>
                                            {years.map(y => (
                                                <div key={y._id} onClick={() => { setNewClass(p => ({ ...p, academicYearId: y._id })); setYearDropdown(false); }} style={{ padding: '12px 16px', fontSize: '0.88rem', color: newClass.academicYearId === y._id ? ACCENT : 'var(--c-muted)', cursor: 'pointer', borderRadius: 10, transition: 'all 0.1s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-hover)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                                >{y.name} Operation</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Btn accent={ACCENT} type="submit" disabled={saving} full style={{ height: 52, borderRadius: 16 }}>
                                    {saving ? <Loader2 size={20} className="animate-spin" /> : <ChevronRight size={20} />}
                                    {saving ? 'Processing...' : 'Deploy Sector'}
                                </Btn>
                            </form>
                        </Card>
                    )}

                    {step === 2 && createdClass && (
                        <Card accent={ACCENT} style={{ padding: 32 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                <div style={{ padding: 8, borderRadius: 10, background: ACCENT + '20', color: ACCENT }}><Layers size={18} /></div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-text)', margin: 0 }}>Inject units: {createdClass.name}</h3>
                            </div>
                            <form onSubmit={saveSubject} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div><Label>Unit Title</Label><Input accent={ACCENT} value={newSubject.name} onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Quantum Physics" required /></div>
                                <div><Label>Unit Code</Label><Input accent={ACCENT} value={newSubject.code} onChange={e => setNewSubject(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. QP-101" required /></div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                    <Btn accent={ACCENT} type="submit" disabled={saving} full style={{ height: 48, borderRadius: 14 }}>
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                        {editingSub ? 'Sync Unit' : 'Inject Unit'}
                                    </Btn>
                                    {editingSub && <Btn ghost onClick={() => { setEditingSub(null); setNewSubject({ name: '', code: '' }); }}>Abort</Btn>}
                                </div>
                            </form>

                            {addedSubjects.length > 0 && (
                                <div style={{ marginTop: 32 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 12 }}>Linked Units ({addedSubjects.length})</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {addedSubjects.map(s => <SubjectPill key={s._id} subject={s} accent={ACCENT} onDelete={deleteSubject} />)}
                                    </div>
                                </div>
                            )}
                            <button onClick={finish} style={{ width: '100%', marginTop: 24, padding: '12px', background: 'var(--c-surface-hover)', border: '1px solid var(--c-border)', borderRadius: 12, cursor: 'pointer', fontSize: '0.8rem', color: ACCENT, fontWeight: 700, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--c-surface-hover)'}>
                                Seal Construction — Return to Architect
                            </button>
                        </Card>
                    )}
                </div>

                {/* Registry Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Book size={20} color={ACCENT} />
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-text)', margin: 0, fontFamily: 'Space Grotesk, sans-serif' }}>Sector Registry</h3>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-muted)', background: 'var(--c-surface-hover)', padding: '4px 14px', borderRadius: 999, border: '1px solid var(--c-border)' }}>{classes.length} Active Sectors</span>
                    </div>

                    {classes.length === 0 ? (
                        <Card style={{ padding: '60px 0', textAlign: 'center', borderStyle: 'dashed' }}>
                            <Empty icon={Layers} title="Registry Empty" sub="Initialize a new class sector to begin orchestration" />
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {classes.map(cls => {
                                const clsSubjects = subjects.filter(s => s.classId?._id === cls._id);
                                const isExpanded = expanded[cls._id];
                                return (
                                    <Card key={cls._id} style={{
                                        padding: 0, overflow: 'hidden',
                                        background: 'var(--c-card-bg)',
                                        borderColor: isExpanded ? ACCENT + '40' : 'var(--c-border)'
                                    }}>
                                        <div style={{ padding: '20px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                                                <div style={{
                                                    width: 54, height: 54, borderRadius: 18, background: ACCENT + '08',
                                                    border: `1px solid ${ACCENT}15`, display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', color: ACCENT
                                                }}>
                                                    <Layout size={24} />
                                                </div>
                                                <div>
                                                    <h4 style={{ fontWeight: 800, color: 'var(--c-text)', fontSize: '1.1rem', margin: '0 0 4px 0' }}>{cls.name}</h4>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: ACCENT, background: ACCENT + '15', padding: '2px 8px', borderRadius: 6 }}>{cls.code}</span>
                                                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-border)' }} />
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-muted)' }}>{clsSubjects.length} Curriculum Units</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <button onClick={() => openForClass(cls)} style={{ padding: '8px 16px', borderRadius: 12, background: 'var(--c-surface-hover)', border: '1px solid var(--c-border)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-text)', display: 'flex', alignItems: 'center', gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = ACCENT + '20'}>
                                                    <Plus size={14} /> Inject
                                                </button>
                                                <button onClick={() => setExpanded(p => ({ ...p, [cls._id]: !p[cls._id] }))} style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--c-surface-hover)', border: '1px solid var(--c-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text)' }}>
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                                <button onClick={() => deleteClass(cls._id)} style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div style={{ padding: '0 24px 24px 24px', animation: 'fadeIn 0.3s ease-out' }}>
                                                <div style={{ padding: '20px', borderRadius: 20, background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                                                    {clsSubjects.length === 0 ? (
                                                        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--c-muted)', padding: '10px 0', margin: 0 }}>No curriculum units active in this sector</p>
                                                    ) : (
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                                                            {clsSubjects.map(sub => (
                                                                <div key={sub._id} style={{ padding: '12px 14px', borderRadius: 16, background: 'var(--c-surface-hover)', border: '1px solid var(--c-border)', position: 'relative' }}>
                                                                    <p style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--c-text)', margin: '0 0 2px 0' }}>{sub.name}</p>
                                                                    <p style={{ fontSize: '0.65rem', color: ACCENT, fontWeight: 700, margin: 0 }}>{sub.code}</p>
                                                                    <button onClick={() => deleteSubject(sub._id)} style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
