import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { toast } from 'react-toastify';
import { initializeSocket } from "../services/socket.service";
import { Trophy, User, Sparkles, X, Loader2, BookOpen, Edit2, Check, BarChart3, ChevronRight, ChevronDown, Search, Users, Layers, GraduationCap, Filter, ArrowLeft } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, PageHeader, Spinner, Btn, Select, Label, Input, Textarea, Empty, Badge, SectionTitle } from "../components/PageLayout";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import api from '../services/api';
const API = api.defaults.baseURL;
const ACCENT = "#fbbf24";

const gradeStyle = (pct) => pct >= 80 ? { color: '#34d399', bar: '#34d399' } : pct >= 60 ? { color: '#fbbf24', bar: '#fbbf24' } : { color: '#f87171', bar: '#f87171' };
const getGrade = (pct) => pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';

export default function Marks() {
    const [user, setUser] = useState(null);
    const [marks, setMarks] = useState([]);
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [filterSub, setFilterSub] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingMark, setEditingMark] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [aiModal, setAiModal] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null);

    // Tree states for teacher
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [expandedClasses, setExpandedClasses] = useState(new Set());
    const [studentSearch, setStudentSearch] = useState("");

    const [form, setForm] = useState({ studentId: '', subjectId: '', examType: 'unit1', marksObtained: '', maxMarks: '100', feedback: '' });

    const filterSubRef = useRef(filterSub);
    const selectedStudentRef = useRef(selectedStudentId);
    useEffect(() => { filterSubRef.current = filterSub; }, [filterSub]);
    useEffect(() => { selectedStudentRef.current = selectedStudentId; }, [selectedStudentId]);

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
                toast.success('Evaluation updated — live ✨');
                setShowForm(false); resetForm();
            } else {
                const res = await axios.post(`${API}/marks/add`, form, { headers: { Authorization: `Bearer ${tk}` } });
                setMarks(prev => [res.data, ...prev]);
                toast.success('Result published — live for student 🛰️');
                resetForm();
                // keep form open? close after publish? keep open for next entry but reset fields
                // If a student is selected in tree, keep it selected
            }
        } catch (e) {
            console.error("Submission error:", e);
            toast.error(e.response?.data?.message || "Failed to publish");
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

    // Auto-expand first class and auto-select student when tree loads
    useEffect(() => {
        if (teacherClasses.length > 0 && expandedClasses.size === 0) {
            setExpandedClasses(new Set([teacherClasses[0]._id.toString()]));
        }
    }, [teacherClasses]);

    // When a student is selected in tree, prefill form student
    useEffect(() => {
        if (selectedStudentId) {
            setForm(p => ({ ...p, studentId: selectedStudentId }));
        }
    }, [selectedStudentId]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        const decoded = jwtDecode(token);
        Promise.resolve().then(() => setUser(decoded));
        const marksUrl = filterSub ? `${API}/marks?subjectId=${filterSub}` : `${API}/marks`;
        axios.get(marksUrl, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => { setMarks(res.data); setLoading(false); })
            .catch(() => { setLoading(false); });
        if (decoded.role === "teacher") {
            axios.get(`${API}/user/students`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setStudents(res.data))
                .catch(() => { });
            axios.get(`${API}/user/classes`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setTeacherClasses(res.data || []))
                .catch(() => {});
        }
        axios.get(`${API}/user/subjects`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setSubjects(res.data))
            .catch(() => { });
        initializeSocket(decoded.id, decoded.classId, decoded.role);
    }, [filterSub]);

    // ---- Realtime: works without refresh for both teacher and student ----
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        let decoded;
        try { decoded = jwtDecode(token); } catch { return; }
        const sock = initializeSocket(decoded.id, decoded.classId, decoded.role);
        if (!sock) return;
        const handler = (payload) => {
            if (!payload?._id) return;
            setMarks(prev => {
                const ex = prev.find(m => m._id === payload._id);
                if (ex) return prev.map(m => m._id === payload._id ? payload : m);
                return [payload, ...prev];
            });
            if (decoded.role === "student") {
                const pct = Math.round((payload.marksObtained / payload.maxMarks) * 100);
                const subj = payload.subjectId?.name || payload.subjectName || "Subject";
                toast.info(`📊 New ${subj}: ${payload.marksObtained}/${payload.maxMarks} (${pct}%) — ${payload.examType}`, { autoClose: 5000 });
            }
        };
        sock.on("marks_updated", handler);
        return () => sock.off("marks_updated", handler);
    }, []);

    const isTeacher = user?.role === 'teacher';

    // Derived: grouped students by class for tree
    const grouped = useMemo(() => {
        if (!isTeacher) return [];
        // Build map from teacherClasses
        const classMap = new Map();
        teacherClasses.forEach(c => {
            const id = c._id.toString();
            classMap.set(id, { cls: c, students: [] });
        });
        // Also ensure classes from subjects/students are represented even if teacherClasses missing
        students.forEach(s => {
            const cid = s.classId?.toString() || s.classId;
            if (!cid) return;
            if (!classMap.has(cid.toString())) {
                // Try to find class object from subjects
                const subjCls = subjects.find(sub => sub.classId?._id?.toString() === cid.toString() || sub.classId?.toString() === cid.toString());
                const fallbackCls = subjCls?.classId || { _id: cid, name: `Class ${cid.slice(-4)}`, section: "" };
                // If fallbackCls is string id, wrap
                const clsObj = typeof fallbackCls === 'string' ? { _id: fallbackCls, name: `Class ${fallbackCls.slice(-4)}` } : fallbackCls;
                classMap.set(cid.toString(), { cls: clsObj, students: [] });
            }
            classMap.get(cid.toString()).students.push(s);
        });
        // Also include classes with no students yet (show empty)
        // Convert to array and filter by search
        let arr = Array.from(classMap.values());
        if (studentSearch.trim()) {
            const term = studentSearch.toLowerCase();
            arr = arr.map(g => ({
                ...g,
                students: g.students.filter(s => s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term))
            })).filter(g => g.cls.name.toLowerCase().includes(term) || g.students.length > 0);
        }
        return arr;
    }, [isTeacher, teacherClasses, students, subjects, studentSearch]);

    const displayedMarks = useMemo(() => {
        let list = marks;
        if (selectedStudentId) {
            list = list.filter(m => {
                const sid = m.studentId?._id || m.studentId;
                return String(sid) === String(selectedStudentId);
            });
        }
        // filterSub already applied server-side, but also ensure client-side for socket-added marks
        if (filterSub) {
            list = list.filter(m => {
                const sid = m.subjectId?._id || m.subjectId;
                return String(sid) === String(filterSub);
            });
        }
        return list;
    }, [marks, selectedStudentId, filterSub]);

    const toggleClass = (classId) => {
        setExpandedClasses(prev => {
            const next = new Set(prev);
            if (next.has(classId)) next.delete(classId);
            else next.add(classId);
            return next;
        });
    };

    if (loading) return <Spinner label="Loading marks…" />;

    const selectedStudent = students.find(s => String(s._id) === String(selectedStudentId));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <PageHeader
                title="Academic Performance"
                subtitle={isTeacher ? "Class → Student tree. Publish and students see it instantly — no refresh." : "Your academic journey, augmented by AI performance insights"}
                accent={ACCENT}
                icon={Trophy}
                right={
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Select accent={ACCENT} value={filterSub} onChange={e => setFilterSub(e.target.value)} style={{ width: 'auto', minWidth: 180, height: 44 }}>
                            <option value="">All Subjects</option>
                            {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                        </Select>
                        {!isTeacher && (
                            <Btn accent="#a78bfa" onClick={handleAI}>
                                <Sparkles size={16} /> AI Analytics
                            </Btn>
                        )}
                        {isTeacher && (
                            <Btn accent={ACCENT} onClick={() => { setShowForm(t => !t); if (showForm) resetForm(); }}>
                                {showForm ? <X size={16} /> : <Edit2 size={16} />} {showForm ? 'Cancel' : 'Publish'}
                            </Btn>
                        )}
                    </div>
                }
            />

            {/* Evaluation Upload Form (Teacher Only) */}
            {showForm && isTeacher && (
                <Card accent={editingMark ? '#fbbf24' : ACCENT} style={{ animation: 'fadeUp 0.4s ease-out' }}>
                    <SectionTitle hint={selectedStudent ? `Publishing for ${selectedStudent.name} — change via tree if needed` : "Pick a class → student in the tree, or choose manually below"}>
                        {editingMark ? "Edit Performance Entry" : "Broadcast Academic Result"}
                    </SectionTitle>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
                            <div>
                                <Label>Learner Profile</Label>
                                <Select accent={ACCENT} value={form.studentId} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))} required disabled={!!editingMark}>
                                    <option value="">— Select student —</option>
                                    {students.map(s => {
                                        const clsName = teacherClasses.find(c => String(c._id) === String(s.classId))?.name || "";
                                        return <option key={s._id} value={s._id}>{s.name} {clsName ? `· ${clsName}` : ""}</option>;
                                    })}
                                </Select>
                            </div>
                            <div>
                                <Label>Instructional Module</Label>
                                <Select accent={ACCENT} value={form.subjectId} onChange={e => setForm(p => ({ ...p, subjectId: e.target.value }))} required>
                                    <option value="">— Select subject —</option>
                                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code}) {s.classId?.name ? `· ${s.classId.name}` : ""}</option>)}
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
                                <Label>Obtained</Label>
                                <Input accent={ACCENT} type="number" value={form.marksObtained} onChange={e => setForm(p => ({ ...p, marksObtained: e.target.value }))} placeholder="e.g. 85" required />
                            </div>
                            <div>
                                <Label>Maximum</Label>
                                <Input accent={ACCENT} type="number" value={form.maxMarks} onChange={e => setForm(p => ({ ...p, maxMarks: e.target.value }))} required />
                            </div>
                            <div>
                                <Label>Feedback</Label>
                                <Input accent={ACCENT} value={form.feedback} onChange={e => setForm(p => ({ ...p, feedback: e.target.value }))} placeholder="Optional insights" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
                            <Btn accent={editingMark ? '#fbbf24' : ACCENT} type="submit" disabled={submitting} style={{ minWidth: 180, height: 46 }}>
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {submitting ? 'Synchronizing…' : editingMark ? 'Update Record' : 'Publish Result'}
                            </Btn>
                            {editingMark && <Btn ghost onClick={() => { resetForm(); setShowForm(false); }}>Cancel Edit</Btn>}
                        </div>
                    </form>
                </Card>
            )}

            {/* Teacher: Tree + Content */}
            {isTeacher ? (
                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }} className="marks-layout">
                    {/* Left: Class → Student Tree */}
                    <div style={{
                        position: 'sticky', top: 84, maxHeight: 'calc(100vh - 96px)', overflow: 'auto',
                        background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-xl)',
                        backdropFilter: 'blur(14px)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column'
                    }} className="custom-scrollbar">
                        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--c-border)', position: 'sticky', top: 0, background: 'var(--c-card-bg)', zIndex: 1, borderRadius: 'var(--r-xl) var(--r-xl) 0 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--c-text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Layers size={16} color={ACCENT} /> Classes
                                </h3>
                                <Badge color={ACCENT}>{grouped.length} classes</Badge>
                            </div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--c-muted)', marginTop: 6 }}>Click a class to expand → pick a student</p>
                            <div style={{ position: 'relative', marginTop: 12 }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-muted)' }} />
                                <input
                                    placeholder="Search class or student..."
                                    value={studentSearch}
                                    onChange={e => setStudentSearch(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 12px 10px 32px', borderRadius: 12,
                                        background: 'var(--c-input-bg)', border: '1px solid var(--c-border)',
                                        color: 'var(--c-text)', fontSize: '0.84rem', outline: 'none'
                                    }}
                                />
                            </div>
                            {/* All students toggle */}
                            <button
                                onClick={() => setSelectedStudentId(null)}
                                style={{
                                    width: '100%', marginTop: 12, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                                    background: !selectedStudentId ? `${ACCENT}14` : 'var(--c-surface)',
                                    border: `1px solid ${!selectedStudentId ? ACCENT + '30' : 'var(--c-border)'}`,
                                    color: !selectedStudentId ? ACCENT : 'var(--c-text)',
                                    fontWeight: 700, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left'
                                }}
                            >
                                <Users size={14} /> All Students <span style={{ marginLeft: 'auto', fontSize: '0.72rem', background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', padding: '2px 8px', borderRadius: 999 }}>{students.length}</span>
                            </button>
                        </div>

                        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {grouped.length === 0 ? (
                                <div style={{ padding: 24, textAlign: 'center', color: 'var(--c-muted)', fontSize: '0.85rem' }}>No classes found. Assign subjects to see tree.</div>
                            ) : grouped.map(({ cls, students: clsStudents }) => {
                                const clsId = cls._id.toString();
                                const isExpanded = expandedClasses.has(clsId);
                                const isClsSelected = false;
                                const count = clsStudents.length;
                                const marksForClass = marks.filter(m => {
                                    const cId = m.classId || m.subjectId?.classId?._id || m.subjectId?.classId;
                                    return String(cId) === clsId;
                                }).length;
                                return (
                                    <div key={clsId} style={{
                                        border: '1px solid var(--c-border)', borderRadius: 14, overflow: 'hidden',
                                        background: 'var(--c-surface)', transition: 'all 0.18s'
                                    }}>
                                        <button onClick={() => toggleClass(clsId)} style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                                            background: isExpanded ? 'var(--c-surface-hover)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left'
                                        }}>
                                            <span style={{
                                                width: 32, height: 32, borderRadius: 10, background: isExpanded ? `${ACCENT}14` : 'var(--c-card-bg)',
                                                border: `1px solid ${isExpanded ? ACCENT + '20' : 'var(--c-border)'}`, display: 'grid', placeItems: 'center', color: isExpanded ? ACCENT : 'var(--c-muted)', flexShrink: 0
                                            }}>
                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 750, fontSize: '0.92rem', color: 'var(--c-text)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {cls.name} {cls.section ? `· Sec ${cls.section}` : ''} {cls.code ? `· ${cls.code}` : ''}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--c-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Users size={10} /> {count} students</span>
                                                    <span>•</span>
                                                    <span>{marksForClass} marks</span>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '0.70rem', fontWeight: 700, padding: '4px 8px', borderRadius: 999, background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>{clsStudents.length}</span>
                                        </button>

                                        {isExpanded && (
                                            <div style={{ borderTop: '1px solid var(--c-border)', background: 'var(--c-card-bg)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {clsStudents.length === 0 ? (
                                                    <div style={{ padding: '12px 10px', fontSize: '0.80rem', color: 'var(--c-muted)', textAlign: 'center' }}>No students in this class</div>
                                                ) : clsStudents.map(s => {
                                                    const isSel = String(s._id) === String(selectedStudentId);
                                                    const sMarks = marks.filter(m => String(m.studentId?._id || m.studentId) === String(s._id));
                                                    const avg = sMarks.length ? Math.round(sMarks.reduce((a, m) => a + (m.marksObtained / m.maxMarks) * 100, 0) / sMarks.length) : null;
                                                    return (
                                                        <button key={s._id} onClick={() => setSelectedStudentId(s._id.toString())} style={{
                                                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 12, cursor: 'pointer', width: '100%', textAlign: 'left',
                                                            background: isSel ? `${ACCENT}12` : 'var(--c-surface)', border: `1px solid ${isSel ? ACCENT + '24' : 'var(--c-border)'}`,
                                                            transition: 'all 0.16s', position: 'relative'
                                                        }}>
                                                            {isSel && <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 999, background: ACCENT }} />}
                                                            <div style={{
                                                                width: 36, height: 36, borderRadius: 10, background: isSel ? `${ACCENT}18` : 'var(--c-card-bg)', border: `1px solid ${isSel ? ACCENT + '20' : 'var(--c-border)'}`,
                                                                display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '0.78rem', color: isSel ? ACCENT : 'var(--c-muted)', flexShrink: 0
                                                            }}>
                                                                {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: isSel ? ACCENT : 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                                                                <div style={{ fontSize: '0.70rem', color: 'var(--c-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                                                <span style={{ fontSize: '0.68rem', fontWeight: 750, padding: '3px 7px', borderRadius: 999, background: avg !== null ? (avg >= 70 ? '#22c55e14' : avg >= 50 ? '#f59e0b14' : '#ef444414') : 'var(--c-surface)', color: avg !== null ? (avg >= 70 ? '#22c55e' : avg >= 50 ? '#f59e0b' : '#ef4444') : 'var(--c-muted)', border: `1px solid ${avg !== null ? (avg >= 70 ? '#22c55e20' : avg >= 50 ? '#f59e0b20' : '#ef444420') : 'var(--c-border)'}` }}>
                                                                    {sMarks.length ? `${sMarks.length} • ${avg}%` : 'No marks'}
                                                                </span>
                                                                {isSel && <ChevronRight size={12} color={ACCENT} />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ padding: 12, borderTop: '1px solid var(--c-border)', display: 'flex', gap: 8 }}>
                            <span style={{ fontSize: '0.70rem', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} /> Live sync via Socket.IO</span>
                        </div>
                    </div>

                    {/* Right: Content */}
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Context bar */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px',
                            background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 14, flexWrap: 'wrap'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <span style={{ width: 32, height: 32, borderRadius: 10, background: selectedStudent ? `${ACCENT}14` : 'var(--c-surface)', border: `1px solid ${selectedStudent ? ACCENT + '20' : 'var(--c-border)'}`, display: 'grid', placeItems: 'center', color: selectedStudent ? ACCENT : 'var(--c-muted)' }}>
                                    {selectedStudent ? <GraduationCap size={16} /> : <Filter size={14} />}
                                </span>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.90rem', color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {selectedStudent ? selectedStudent.name : "All students"}
                                        {filterSub ? ` • ${subjects.find(s => s._id === filterSub)?.name || "Subject"}` : ""}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--c-muted)' }}>
                                        {selectedStudent ? selectedStudent.email : `${students.length} students`} • {displayedMarks.length} records {filterSub ? `• filtered` : ""} • live
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {selectedStudent && (
                                    <Btn ghost size="sm" onClick={() => setSelectedStudentId(null)} style={{ height: 36 }}>
                                        <ArrowLeft size={14} /> Clear student
                                    </Btn>
                                )}
                                <Badge color={ACCENT}>{displayedMarks.length} shown</Badge>
                            </div>
                        </div>

                        {/* Marks list for selected context */}
                        {displayedMarks.length === 0 ? (
                            <Card style={{ padding: 40, textAlign: 'center' }}>
                                <Empty
                                    icon={BarChart3}
                                    title={selectedStudent ? `No marks for ${selectedStudent.name.split(' ')[0]}` : "No records for this view"}
                                    sub={selectedStudent ? "Publish a result via the form above — student sees it instantly without refresh." : "Select a class → student from the tree, or publish a new result. Updates are live via Socket.IO."}
                                />
                                {selectedStudent && (
                                    <div style={{ marginTop: 16 }}>
                                        <Btn accent={ACCENT} onClick={() => setShowForm(true)}>Publish for {selectedStudent.name.split(' ')[0]}</Btn>
                                    </div>
                                )}
                            </Card>
                        ) : (
                            Object.entries(
                                displayedMarks.reduce((acc, m) => {
                                    const catMap = { midterm: "MID TERM", final: "FINAL", quiz: "QUIZ", assignment: "ASSIGNMENT", unit1: "UNIT 1", unit2: "UNIT 2" };
                                    const cat = catMap[m.examType] || m.examType.toUpperCase();
                                    if (!acc[cat]) acc[cat] = [];
                                    acc[cat].push(m);
                                    return acc;
                                }, {})
                            ).map(([catName, catMarks]) => (
                                <div key={catName}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingLeft: 4 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 10px ${ACCENT}60` }} />
                                        <h4 style={{ fontSize: '0.82rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--c-text)', margin: 0 }}>{catName}</h4>
                                        <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${ACCENT}20, transparent)`, marginLeft: 10 }} />
                                        <Badge color={ACCENT}>{catMarks.length}</Badge>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                                        {catMarks.map((mark) => {
                                            const pct = Math.round((mark.marksObtained / mark.maxMarks) * 100);
                                            const gs = gradeStyle(pct);
                                            const grade = getGrade(pct);
                                            return (
                                                <Card key={mark._id} style={{ position: 'relative', border: '1px solid var(--c-border)' }}>
                                                    <div style={{ position: 'absolute', top: -8, right: 6, fontSize: '3.8rem', fontWeight: 900, color: gs.color, opacity: 0.08, lineHeight: 1, pointerEvents: 'none' }}>{grade}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                                                        <div>
                                                            <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--c-text)', margin: 0 }}>{mark.studentId?.name}</p>
                                                            <p style={{ fontSize: '0.72rem', color: 'var(--c-muted)', marginTop: 2 }}>{mark.subjectId?.name} • {mark.subjectId?.code}</p>
                                                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                                                <Badge color={ACCENT} size="sm">{mark.examType}</Badge>
                                                                <Badge color={gs.color} size="sm">GRADE {grade}</Badge>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: gs.color, lineHeight: 1 }}>{mark.marksObtained}</div>
                                                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--c-muted)' }}>/{mark.maxMarks} • {pct}%</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ height: 6, borderRadius: 999, background: 'var(--c-surface)', border: '1px solid var(--c-border)', overflow: 'hidden', marginBottom: 10 }}>
                                                        <div style={{ height: '100%', width: `${pct}%`, background: gs.bar, borderRadius: 999, transition: 'width 0.8s' }} />
                                                    </div>
                                                    {mark.feedback && <div style={{ fontSize: '0.84rem', color: 'var(--c-text)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '10px 12px', fontStyle: 'italic', marginBottom: 12 }}>{mark.feedback}</div>}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--c-border)', fontSize: '0.72rem', color: 'var(--c-muted)' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><User size={12} /> {mark.uploadedBy?.name}</span>
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <span>{new Date(mark.createdAt).toLocaleDateString()}</span>
                                                            <Btn ghost size="sm" onClick={() => handleEdit(mark)} style={{ padding: '4px 10px', height: 'auto' }}>Edit</Btn>
                                                        </div>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                // Student view: keep subject cards -> marks
                !filterSub ? (
                    <div style={{ animation: 'fadeUp 0.6s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <div style={{ width: 6, height: 26, borderRadius: 10, background: ACCENT }}></div>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', fontSize: '1.15rem', margin: 0 }}>Your Subjects</h2>
                            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} /> Live updates — no refresh needed</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                            {subjects.map((sub, i) => (
                                <Card key={sub._id} style={{ cursor: 'pointer', animation: `scaleIn 0.4s ease-out ${i * 0.04}s`, position: 'relative', overflow: 'hidden' }} onClick={() => setFilterSub(sub._id)}>
                                    <div style={{ position: 'absolute', top: -16, right: -16, width: 90, height: 90, background: `${ACCENT}06`, borderRadius: '50%', border: `1px solid ${ACCENT}12` }} />
                                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `${ACCENT}12`, border: `1px solid ${ACCENT}20`, display: 'grid', placeItems: 'center', marginBottom: 16, color: ACCENT }}><BookOpen size={20} /></div>
                                    <h3 style={{ fontWeight: 800, color: 'var(--c-text)', fontSize: '1.05rem', margin: 0 }}>{sub.name}</h3>
                                    <p style={{ color: 'var(--c-muted)', fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.06em', marginTop: 4, textTransform: 'uppercase' }}>{sub.code} • {sub.classId?.name || ""}</p>
                                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: ACCENT, fontSize: '0.82rem', fontWeight: 700 }}>View marks <ChevronRight size={14} /></div>
                                </Card>
                            ))}
                        </div>
                        {subjects.length === 0 && <Card style={{ marginTop: 16, padding: 40 }}><Empty icon={BarChart3} title="No subjects" sub="Your subjects will appear here." /></Card>}
                        {/* Recent marks preview for student when no subject selected — shows live marks */}
                        {marks.length > 0 && (
                            <div style={{ marginTop: 24 }}>
                                <h3 style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 12, color: 'var(--c-text)' }}>Recent Results — live</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                                    {marks.slice(0, 6).map(m => {
                                        const pct = Math.round((m.marksObtained / m.maxMarks) * 100);
                                        const gs = gradeStyle(pct);
                                        return (
                                            <Card key={m._id} style={{ padding: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 750, fontSize: '0.90rem', color: 'var(--c-text)' }}>{m.subjectId?.name}</div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--c-muted)' }}>{m.examType} • {new Date(m.createdAt).toLocaleDateString()}</div>
                                                    </div>
                                                    <div style={{ fontWeight: 900, color: gs.color }}>{m.marksObtained}/{m.maxMarks}</div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.5s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--c-surface)', padding: '10px 16px', borderRadius: 14, border: '1px solid var(--c-border)', flexWrap: 'wrap', gap: 12 }}>
                            <Btn ghost onClick={() => setFilterSub("")} style={{ height: 36 }}><ArrowLeft size={14} /> All subjects</Btn>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--c-text)' }}>{subjects.find(s => s._id === filterSub)?.name}</span>
                                <Badge color={ACCENT}>{displayedMarks.length} records • live</Badge>
                            </div>
                        </div>
                        {displayedMarks.length === 0 ? (
                            <Card style={{ padding: 40, textAlign: 'center' }}><Empty icon={BarChart3} title="No records" sub="No marks for this subject yet — when teacher publishes, you'll see it here instantly." /></Card>
                        ) : (
                            Object.entries(displayedMarks.reduce((acc, m) => {
                                const catMap = { midterm: "MID TERM", final: "FINAL", quiz: "QUIZ", assignment: "ASSIGNMENT", unit1: "UNIT 1", unit2: "UNIT 2" };
                                const cat = catMap[m.examType] || m.examType.toUpperCase();
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(m);
                                return acc;
                            }, {})).map(([catName, catMarks]) => (
                                <div key={catName}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT }} />
                                        <h4 style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--c-muted)', margin: 0 }}>{catName}</h4>
                                        <div style={{ flex: 1, height: 1, background: 'var(--c-border)', marginLeft: 8 }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                                        {catMarks.map((mark) => {
                                            const pct = Math.round((mark.marksObtained / mark.maxMarks) * 100);
                                            const gs = gradeStyle(pct);
                                            const grade = getGrade(pct);
                                            return (
                                                <Card key={mark._id} style={{ border: '1px solid var(--c-border)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                                        <div>
                                                            <div style={{ fontWeight: 800, color: 'var(--c-text)' }}>{mark.subjectId?.name}</div>
                                                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}><Badge color={ACCENT} size="sm">{mark.examType}</Badge><Badge color={gs.color} size="sm">GRADE {grade}</Badge></div>
                                                        </div>
                                                        <div style={{ textAlign: 'right', fontWeight: 900, color: gs.color, fontSize: '1.4rem', lineHeight: 1 }}>{mark.marksObtained}<span style={{ fontSize: '0.72rem', color: 'var(--c-muted)', fontWeight: 600 }}>/{mark.maxMarks}</span></div>
                                                    </div>
                                                    <div style={{ height: 6, borderRadius: 999, background: 'var(--c-surface)', border: '1px solid var(--c-border)', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: gs.bar }} /></div>
                                                    <div style={{ marginTop: 8, fontSize: '0.80rem', color: gs.color, fontWeight: 800 }}>{pct}% • {grade}</div>
                                                    {mark.feedback && <div style={{ marginTop: 10, fontStyle: 'italic', fontSize: '0.84rem', color: 'var(--c-muted)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', padding: '10px 12px', borderRadius: 10 }}>{mark.feedback}</div>}
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )
            )}

            {/* AI Coach Modal */}
            {aiModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
                    <div style={{ width: '100%', maxWidth: 800, maxHeight: '85vh', background: 'var(--c-bg)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 50px 100px rgba(0,0,0,0.8)' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'grid', placeItems: 'center', color: '#a78bfa' }}><Sparkles size={20} /></div>
                                <div>
                                    <h3 style={{ fontWeight: 800, color: 'var(--c-text)', fontSize: '1.05rem', margin: 0 }}>AI Performance Analyst</h3>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--c-muted)', margin: 0 }}>{aiResult?.isFallback ? "Rule-based (AI busy)" : "High-fidelity synthesis"}</p>
                                </div>
                            </div>
                            <button onClick={() => setAiModal(false)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-surface)', border: '1px solid var(--c-border)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={16} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }} className="custom-scrollbar">
                            {aiLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
                                    <Loader2 size={28} className="animate-spin" color="#a78bfa" />
                                    <p style={{ color: 'var(--c-muted)', fontWeight: 600 }}>Synthesizing…</p>
                                </div>
                            ) : aiResult?.error ? (
                                <p style={{ color: '#f87171', textAlign: 'center', fontWeight: 600 }}>{aiResult.error}</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {aiResult?.summary && <div style={{ padding: 16, borderRadius: 14, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.14)', fontWeight: 600, color: 'var(--c-text)' }}>{aiResult.summary}</div>}
                                    {aiResult?.graphData?.length > 0 && (
                                        <div style={{ height: 260, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, padding: 16 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={aiResult.graphData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false} />
                                                    <XAxis dataKey="subject" stroke="var(--c-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                                    <YAxis domain={[0, 100]} stroke="var(--c-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                                    <Tooltip contentStyle={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 10, fontSize: '12px' }} />
                                                    <Area type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} fill="rgba(167,139,250,0.12)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                    {aiResult?.analysis && <div style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--c-text)' }}><ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResult.analysis}</ReactMarkdown></div>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes fadeUp { from { opacity:0; transform:translateY(10px);} to {opacity:1; transform:translateY(0);} }
                @keyframes scaleIn { from { opacity:0; transform:scale(0.96);} to {opacity:1; transform:scale(1);} }
                .custom-scrollbar::-webkit-scrollbar { width: 8px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--c-border); borderRadius: 999px; }
                @media (max-width: 1100px) { .marks-layout { grid-template-columns: 1fr !important; } .marks-layout > div:first-child { position: relative !important; top: 0 !important; max-height: none !important; } }
            `}</style>
        </div>
    );
}
