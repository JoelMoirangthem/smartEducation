import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { toast } from 'react-toastify';
import { initializeSocket } from "../services/socket.service";
import { Trophy, User, Sparkles, X, Loader2, BookOpen, Edit2, Check, BarChart3, ChevronRight } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, PageHeader, Spinner, Btn, Select, Label, Input, Textarea, Empty, Badge, SectionTitle } from "../components/PageLayout";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API = "http://localhost:5000/api/v1";
const ACCENT = "#fbbf24";

const gradeStyle = (pct) => pct >= 80 ? { color: '#34d399', bar: '#34d399' } : pct >= 60 ? { color: '#fbbf24', bar: '#fbbf24' } : { color: '#f87171', bar: '#f87171' };
const getGrade = (pct) => pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';

export default function Marks() {
    const [user, setUser] = useState(null);
    const [marks, setMarks] = useState([]);
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [filterSub, setFilterSub] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingMark, setEditingMark] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [aiModal, setAiModal] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null);

    const [form, setForm] = useState({ studentId: '', subjectId: '', examType: 'unit1', marksObtained: '', maxMarks: '100', feedback: '' });

    const resetForm = () => { setForm({ studentId: '', subjectId: '', examType: 'unit1', marksObtained: '', maxMarks: '100', feedback: '' }); setEditingMark(null); };

    const handleEdit = (m) => {
        setForm({ studentId: m.studentId._id, subjectId: m.subjectId._id, examType: m.examType, marksObtained: m.marksObtained, maxMarks: m.maxMarks, feedback: m.feedback || '' });
        setEditingMark(m); setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSubmitting(true);
        try {
            const tk = localStorage.getItem("token");
            if (editingMark) {
                const res = await axios.put(`${API}/marks/${editingMark._id}`, form, { headers: { Authorization: `Bearer ${tk}` } });
                setMarks(prev => prev.map(m => m._id === editingMark._id ? res.data : m));
                toast.success('Evaluation Modification Synchronized ✨', {
                    description: `Records for ${res.data.studentId?.name || 'the student'} have been updated.`
                });
                setShowForm(false); resetForm();
            } else {
                const res = await axios.post(`${API}/marks/add`, form, { headers: { Authorization: `Bearer ${tk}` } });
                setMarks(prev => [res.data, ...prev]);
                toast.success('Broadcast Complete: Result Live 🛰️', {
                    description: `Academic records have been propagated to ${res.data.studentId?.name || 'the student'}.`
                });
                resetForm();
            }
        } catch (e) {
            console.error("Submission error:", e);
            toast.error(e.response?.data?.message || "Dissemination Transmission Failed");
        }
        setSubmitting(false);
    };

    const handleAI = async () => {
        setAiModal(true); setAiLoading(true); setAiResult(null);
        try {
            const tk = localStorage.getItem("token");
            const res = await axios.post(`${API}/ai/analyze`, { subjectId: filterSub }, { headers: { Authorization: `Bearer ${tk}` } });
            setAiResult(res.data);
        } catch (e) {
            console.error("AI Error:", e);
            setAiResult({ error: "Failed to generate analysis." });
        }
        setAiLoading(false);
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        const decoded = jwtDecode(token);
        setUser(decoded);
        fetchMarks(token);
        if (decoded.role === "teacher") { fetchStudents(token); fetchSubjects(token); }
        else { fetchSubjects(token); }
        const socket = initializeSocket(decoded.id, decoded.classId, decoded.role);
        if (socket) {
            socket.on("connect", () => { if (decoded.id) socket.emit("join_room", `user:${decoded.id}`); });
            const handleUpdate = u => {
                if (u?._id) {
                    setMarks(prev => {
                        const ex = prev.find(m => m._id === u._id);
                        return ex ? prev.map(m => m._id === u._id ? u : m) : [u, ...prev];
                    });
                } else {
                    fetchMarks(token);
                }
            };
            socket.on("marks_updated", handleUpdate);
            return () => socket.off("marks_updated", handleUpdate);
        }
    }, [filterSub]);

    const fetchMarks = async (tk) => { try { const url = filterSub ? `${API}/marks?subjectId=${filterSub}` : `${API}/marks`; const res = await axios.get(url, { headers: { Authorization: `Bearer ${tk}` } }); setMarks(res.data); } catch { } setLoading(false); };
    const fetchStudents = async (tk) => { try { const res = await axios.get(`${API}/user/students`, { headers: { Authorization: `Bearer ${tk}` } }); setStudents(res.data); } catch { } };
    const fetchSubjects = async (tk) => { try { const res = await axios.get(`${API}/user/subjects`, { headers: { Authorization: `Bearer ${tk}` } }); setSubjects(res.data); } catch { } };

    if (loading) return <Spinner label="Loading marks…" />;

    const isTeacher = user?.role === 'teacher';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <PageHeader
                title="Academic Performance"
                subtitle={isTeacher ? "Manage and broadcast student evaluated outcomes" : "Your academic journey, augmented by AI performance insights"}
                accent={ACCENT}
                icon={Trophy}
                right={
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <Select accent={ACCENT} value={filterSub} onChange={e => setFilterSub(e.target.value)} style={{ width: 'auto', minWidth: 200, height: 48 }}>
                            <option value="">All Subjects</option>
                            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </Select>
                        {!isTeacher && (
                            <Btn accent="#a78bfa" onClick={handleAI}>
                                <Sparkles size={18} /> AI Analytics
                            </Btn>
                        )}
                        {isTeacher && (
                            <Btn accent={ACCENT} onClick={() => { setShowForm(t => !t); if (showForm) resetForm(); }}>
                                {showForm ? <X size={18} /> : <Edit2 size={18} />} {showForm ? 'Cancel' : 'Register Result'}
                            </Btn>
                        )}
                    </div>
                }
            />

            {/* Evaluation Upload Form (Teacher Only) */}
            {showForm && isTeacher && (
                <Card accent={editingMark ? '#fbbf24' : ACCENT} style={{ animation: 'fadeUp 0.4s ease-out', marginBottom: 32 }}>
                    <SectionTitle>{editingMark ? "Edit Performance Entry" : "Broadcast Academic Result"}</SectionTitle>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
                            <div>
                                <Label>Learner Profile</Label>
                                <Select accent={ACCENT} value={form.studentId} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))} required disabled={!!editingMark}>
                                    <option value="">— Select student —</option>
                                    {students.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </Select>
                            </div>
                            <div>
                                <Label>Instructional Module</Label>
                                <Select accent={ACCENT} value={form.subjectId} onChange={e => setForm(p => ({ ...p, subjectId: e.target.value }))} required>
                                    <option value="">— Select subject —</option>
                                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                                </Select>
                            </div>
                            <div>
                                <Label>Assessment Milestone</Label>
                                <Select accent={ACCENT} value={form.examType} onChange={e => setForm(p => ({ ...p, examType: e.target.value }))}>
                                    <option value="unit1">Unit Test 1</option>
                                    <option value="unit2">Unit Test 2</option>
                                    <option value="midterm">Mid-Term Examination</option>
                                    <option value="final">Final Examination</option>
                                    <option value="quiz">Quiz Assessment</option>
                                    <option value="assignment">Assignment / Project</option>
                                </Select>
                            </div>
                            <div>
                                <Label>Obtained Quantifier</Label>
                                <Input accent={ACCENT} type="number" value={form.marksObtained} onChange={e => setForm(p => ({ ...p, marksObtained: e.target.value }))} placeholder="e.g. 85" required />
                            </div>
                            <div>
                                <Label>Maximum Potential</Label>
                                <Input accent={ACCENT} type="number" value={form.maxMarks} onChange={e => setForm(p => ({ ...p, maxMarks: e.target.value }))} required />
                            </div>
                            <div>
                                <Label>Qualitative Feedback</Label>
                                <Input accent={ACCENT} value={form.feedback} onChange={e => setForm(p => ({ ...p, feedback: e.target.value }))} placeholder="Optional academic insights" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
                            <Btn accent={editingMark ? '#fbbf24' : ACCENT} type="submit" disabled={submitting} style={{ minWidth: 200, height: 52 }}>
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                {submitting ? 'Synchronizing…' : editingMark ? 'Update Record' : 'Publish Result'}
                            </Btn>
                            {editingMark && <Btn ghost onClick={() => { resetForm(); setShowForm(false); }}>Cancel Edit</Btn>}
                        </div>
                    </form>
                </Card>
            )}

            {/* Main Content Area */}
            {!filterSub ? (
                /* SUBJECT SELECTION DASHBOARD */
                <div style={{ animation: 'fadeUp 0.6s ease-out' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                        <div style={{ width: 6, height: 24, borderRadius: 10, background: ACCENT }}></div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', fontSize: '1.25rem', margin: 0 }}>
                            Curriculum Module Selection
                        </h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                        {subjects.map((sub, i) => (
                            <Card key={sub._id} style={{
                                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                animation: `scaleIn 0.4s ease-out ${i * 0.05}s`,
                                border: '1px solid var(--c-border)',
                                position: 'relative', overflow: 'hidden'
                            }} onClick={() => setFilterSub(sub._id)}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-10px)';
                                    e.currentTarget.style.borderColor = `${ACCENT}80`;
                                    e.currentTarget.style.boxShadow = `0 30px 60px ${ACCENT}20`;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = 'var(--c-border)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}>
                                <div style={{ position: 'absolute', top: -15, right: -15, width: 100, height: 100, background: `${ACCENT}08`, borderRadius: '50%', border: `1px solid ${ACCENT}15` }} />
                                <div style={{ width: 56, height: 56, borderRadius: 18, background: `${ACCENT}15`, border: `1px solid ${ACCENT}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                                    <BookOpen size={28} color={ACCENT} />
                                </div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', fontSize: '1.3rem', marginBottom: 8 }}>{sub.name}</h3>
                                <p style={{ color: 'var(--c-muted)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 24, textTransform: 'uppercase' }}>{sub.code}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: ACCENT, fontSize: '0.9rem', fontWeight: 800 }}>
                                    Launch Performance Matrix <ChevronRight size={18} />
                                </div>
                            </Card>
                        ))}
                    </div>
                    {subjects.length === 0 && (
                        <Card style={{ padding: 60, textAlign: 'center' }}>
                            <Empty icon={BarChart3} title="Module Sync Required" sub="Your academic modules will appear here once the department synchronizes your enrollment." />
                        </Card>
                    )}
                </div>
            ) : (
                /* DETAILED CATEGORICAL RESULTS */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 40, animation: 'fadeUp 0.5s ease-out' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--c-surface)', padding: '12px 24px', borderRadius: 20, border: '1px solid var(--c-border)' }}>
                        <Btn ghost onClick={() => setFilterSub("")} style={{ color: ACCENT, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <ChevronRight size={18} style={{ transform: 'rotate(180deg)', marginRight: 8 }} /> Exit Module View
                        </Btn>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--c-text)' }}>
                                {subjects.find(s => s._id === filterSub)?.name}
                            </h2>
                            <Badge color={ACCENT}>{marks.length} Evaluations Registered</Badge>
                        </div>
                    </div>

                    {marks.length === 0 ? (
                        <Card style={{ padding: 60 }}>
                            <Empty icon={BarChart3} title="No Records Synchronized" sub="We couldn't find any performance data for this module in the central repository." />
                        </Card>
                    ) : (
                        Object.entries(
                            marks.reduce((acc, m) => {
                                const categoryMap = {
                                    midterm: "MID TERM MARKS",
                                    final: "FINAL EXAMINATION MARKS",
                                    quiz: "QUIZ EVALUATIONS",
                                    assignment: "ASSIGNMENT & PROJECT MARKS",
                                    unit1: "UNIT TEST 1 MARKS",
                                    unit2: "UNIT TEST 2 MARKS"
                                };
                                const catName = categoryMap[m.examType] || (m.examType.toUpperCase() + " EVALUATIONS");
                                if (!acc[catName]) acc[catName] = [];
                                acc[catName].push(m);
                                return acc;
                            }, {})
                        ).map(([catName, catMarks]) => (
                            <div key={catName}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingLeft: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 15px ${ACCENT}60` }} />
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--c-text)', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>{catName}</h4>
                                    <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${ACCENT}30, transparent)`, marginLeft: 16 }} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
                                    {catMarks.map((mark, i) => {
                                        const pct = Math.round((mark.marksObtained / mark.maxMarks) * 100);
                                        const gs = gradeStyle(pct);
                                        const grade = getGrade(pct);
                                        return (
                                            <Card key={mark._id} style={{
                                                position: 'relative',
                                                animation: `scaleIn 0.4s ease-out ${i * 0.05}s`,
                                                animationFillMode: 'both',
                                                border: '1px solid var(--c-border)',
                                                background: 'linear-gradient(135deg, var(--c-surface), var(--c-bg))'
                                            }}>
                                                <div style={{
                                                    position: 'absolute', top: -10, right: -5, fontSize: '6.5rem',
                                                    fontWeight: 950, color: gs.color, opacity: 0.1,
                                                    lineHeight: 1, pointerEvents: 'none', fontFamily: 'var(--font-display)'
                                                }}>{grade}</div>

                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                                                    <div>
                                                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-text)', marginBottom: 6 }}>{isTeacher ? mark.studentId?.name : (mark.subjectId?.name || 'Academic Record')}</p>
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <Badge color={ACCENT} style={{ opacity: 0.8, fontSize: '0.65rem' }}>{mark.examType}</Badge>
                                                            <Badge color={gs.color} style={{ fontSize: '0.65rem' }}>GRADE {grade}</Badge>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontSize: '2.4rem', fontWeight: 950, color: gs.color, lineHeight: 1, fontFamily: 'var(--font-display)' }}>{mark.marksObtained}</p>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--c-muted)', fontWeight: 800, marginTop: 4 }}>MAX CAP {mark.maxMarks}</p>
                                                    </div>
                                                </div>

                                                <div style={{ height: 10, borderRadius: 12, background: 'rgba(255,255,255,0.03)', overflow: 'hidden', marginBottom: 18, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${gs.bar}dd, ${gs.bar})`, borderRadius: 12, transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: `0 0 10px ${gs.bar}40` }} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                                    <span style={{ fontSize: '0.9rem', color: gs.color, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{pct}% Performance Index</span>
                                                </div>

                                                {mark.feedback && (
                                                    <div style={{
                                                        padding: '18px', borderRadius: 20, background: 'rgba(255,255,255,0.02)',
                                                        border: '1px solid rgba(255,255,255,0.05)', marginBottom: 24,
                                                        fontSize: '0.9rem', color: 'var(--c-text)', lineHeight: 1.7, fontStyle: 'italic',
                                                        position: 'relative'
                                                    }}>
                                                        <span style={{ position: 'absolute', top: 5, left: 8, fontSize: '1.5rem', color: ACCENT, opacity: 0.3 }}>"</span>
                                                        {mark.feedback}
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, borderTop: '1px solid var(--c-border)', fontSize: '0.75rem', color: 'var(--c-muted)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: 10, background: 'var(--c-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--c-border)' }}>
                                                            <User size={14} />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: 800, color: 'var(--c-text)' }}>{isTeacher ? mark.studentId?.name : (mark.uploadedBy?.name || 'Academic Council')}</span>
                                                            <span style={{ fontSize: '0.65rem' }}>Recorded on {new Date(mark.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    {isTeacher && (
                                                        <Btn ghost size="sm" onClick={() => handleEdit(mark)} style={{ fontSize: '0.7rem', height: 'auto', padding: '6px 12px' }}>Edit Record</Btn>
                                                    )}
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* AI Coach Modal */}
            {aiModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', transition: 'all 0.3s ease' }}>
                    <div style={{
                        width: '100%', maxWidth: 800, maxHeight: '85vh',
                        background: 'var(--c-bg)', border: '1px solid rgba(167,139,250,0.3)',
                        borderRadius: 32, display: 'flex', flexDirection: 'column',
                        overflow: 'hidden', boxShadow: '0 50px 100px rgba(0,0,0,0.8)',
                        animation: 'fadeUp 0.5s cubic-bezier(0.2, 1, 0.3, 1)'
                    }}>
                        <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to right, rgba(167,139,250,0.1), transparent)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', boxShadow: '0 8px 20px rgba(167,139,250,0.2)' }}>
                                    <Sparkles size={28} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', fontSize: '1.5rem', margin: 0 }}>AI Performance Analyst</h3>
                                        {aiResult?.isFallback && (
                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fbbf24', background: '#fbbf2415', border: '1px solid #fbbf2430', padding: '4px 10px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Simplified Analysis
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--c-muted)', fontWeight: 500, margin: 0 }}>{aiResult?.isFallback ? "Rule-based statistical insights (AI Services Busy)" : "High-fidelity cognitive synthesis of your academic profile"}</p>
                                </div>
                            </div>
                            <button onClick={() => setAiModal(false)} style={{
                                width: 44, height: 44, borderRadius: '50%', background: 'var(--c-surface)',
                                border: '1px solid var(--c-border)', color: 'var(--c-text)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }} onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--c-surface)'}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '40px', background: 'var(--c-bg)' }} className="custom-scrollbar">
                            {aiLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '60px 0' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid var(--c-border)', borderTopColor: '#a78bfa', animation: 'spin 1s linear infinite' }} />
                                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--c-muted)' }}>Synthesizing Evaluation Matrix…</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                                    {aiResult.error ? (
                                        <p style={{ color: '#f87171', fontWeight: 600, textAlign: 'center' }}>{aiResult.error}</p>
                                    ) : (
                                        <>
                                            {/* Summary Card */}
                                            {aiResult.summary && (
                                                <div style={{ padding: 24, borderRadius: 24, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Executive Summary</h4>
                                                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--c-text)', lineHeight: 1.5 }}>{aiResult.summary}</p>
                                                </div>
                                            )}

                                            {/* Progress over time graph */}
                                            {aiResult.trendData && aiResult.trendData.length > 0 && (
                                                <div style={{ padding: 24, borderRadius: 24, background: 'var(--c-surface)', border: '1px solid var(--c-border)', height: 350, display: 'flex', flexDirection: 'column' }}>
                                                    <h4 style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: 'var(--c-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress Evolution</h4>
                                                    <div style={{ flex: 1, minHeight: 0 }}>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={aiResult.trendData}>
                                                                <defs>
                                                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                                                                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                                                                    </linearGradient>
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false} />
                                                                <XAxis dataKey="date" stroke="var(--c-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                                                <YAxis domain={[0, 100]} stroke="var(--c-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                                                <Tooltip
                                                                    contentStyle={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '12px', fontSize: '13px', color: 'var(--c-text)' }}
                                                                    itemStyle={{ color: '#a78bfa', fontWeight: 800 }}
                                                                />
                                                                <Area
                                                                    type="monotone"
                                                                    dataKey="score"
                                                                    stroke="#a78bfa"
                                                                    strokeWidth={3}
                                                                    fillOpacity={1}
                                                                    fill="url(#colorScore)"
                                                                    animationDuration={2000}
                                                                />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Highlights Grid */}
                                            {aiResult.highlights && aiResult.highlights.length > 0 && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                                    {aiResult.highlights.map((h, i) => (
                                                        <div key={i} style={{ padding: 16, borderRadius: 16, background: 'var(--c-surface)', border: '1px solid var(--c-border)', display: 'flex', gap: 12 }}>
                                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', marginTop: 6, flexShrink: 0 }} />
                                                            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--c-text)' }}>{h}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Performance Graph */}
                                            {aiResult.graphData && aiResult.graphData.length > 0 && (
                                                <div style={{ padding: 24, borderRadius: 24, background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                                                    <h4 style={{ margin: '0 0 24px 0', fontSize: '0.9rem', color: 'var(--c-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance Matrix</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                                        {aiResult.graphData.map((d, i) => (
                                                            <div key={i}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', fontWeight: 700 }}>
                                                                    <span>{d.subject}</span>
                                                                    <span style={{ color: d.score >= 80 ? '#34d399' : d.score >= 60 ? '#fbbf24' : '#f87171' }}>{d.score}%</span>
                                                                </div>
                                                                <div style={{ height: 12, borderRadius: 10, background: 'var(--c-bg)', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
                                                                    <div style={{
                                                                        height: '100%',
                                                                        width: `${d.score}%`,
                                                                        background: `linear-gradient(90deg, #a78bfa, ${d.score >= 80 ? '#34d399' : d.score >= 60 ? '#fbbf24' : '#f87171'})`,
                                                                        borderRadius: 10,
                                                                        transition: 'width 1.5s cubic-bezier(0.2, 1, 0.3, 1)'
                                                                    }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Detailed Analysis */}
                                            <div style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--c-text)' }}>
                                                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--c-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detailed Cognitive Synthesis</h4>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        p: ({ children }) => <p style={{ marginBottom: 20 }}>{children}</p>,
                                                        ul: ({ children }) => <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 24 }}>{children}</ul>,
                                                        ol: ({ children }) => <ol style={{ listStyle: 'decimal', paddingLeft: 24, marginBottom: 24 }}>{children}</ol>,
                                                        li: ({ children }) => (
                                                            <li style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
                                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', marginTop: 10, flexShrink: 0 }} />
                                                                <span>{children}</span>
                                                            </li>
                                                        ),
                                                        h2: ({ children }) => <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', fontSize: '1.35rem', marginBottom: 16, marginTop: 40, borderBottom: '1px solid var(--c-border)', paddingBottom: 12 }}>{children}</h2>,
                                                        h3: ({ children }) => <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: '#a78bfa', fontSize: '1.1rem', marginBottom: 12, marginTop: 28 }}>{children}</h3>,
                                                        strong: ({ children }) => <strong style={{ color: '#a78bfa', fontWeight: 800 }}>{children}</strong>,
                                                        code: ({ children, className }) => className ? (
                                                            <div style={{ position: 'relative', marginBottom: 24 }}>
                                                                <pre style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 20, padding: 24, overflow: 'auto' }}>
                                                                    <code style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>{children}</code>
                                                                </pre>
                                                            </div>
                                                        ) : <code style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '4px 8px', fontSize: '0.9rem', fontWeight: 600 }}>{children}</code>,
                                                        blockquote: ({ children }) => (
                                                            <blockquote style={{ borderLeft: '4px solid #a78bfa', paddingLeft: 24, margin: '24px 0', fontStyle: 'italic', color: 'var(--c-muted)' }}>{children}</blockquote>
                                                        )
                                                    }}
                                                >{aiResult.analysis || 'Evaluation matrix currently unavailable.'}</ReactMarkdown>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
                @keyframes spin { to { transform:rotate(360deg); } }
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;  
                    overflow: hidden;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--c-border); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--c-muted); }
            `}</style>
        </div>
    );
}
