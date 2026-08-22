import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { initializeSocket } from "../services/socket.service";
import {
    Upload, FileText, Download, Eye, X, CheckCircle, File, User,
    Cloud, Brain, Lightbulb, Loader2, BookOpen, Video, Image as ImgIcon
} from "lucide-react";
import { Card, PageHeader, Spinner, Btn, Select, Label, Input, Textarea, Empty, Badge, SectionTitle } from "../components/PageLayout";
import { toast } from 'react-toastify';

import api from '../services/api';
const API = api.defaults.baseURL;
const ACCENT_COLOR = "#fb923c";

const fileIcon = (type) => {
    if (!type) return <File size={24} />;
    if (type.includes("pdf")) return <FileText size={24} />;
    if (type.includes("video")) return <Video size={24} />;
    if (type.includes("image")) return <ImgIcon size={24} />;
    return <File size={24} />;
};

const fileColor = (type) => {
    if (!type) return '#94a3b8';
    if (type.includes("pdf")) return '#f87171';
    if (type.includes("video")) return '#a78bfa';
    if (type.includes("image")) return '#34d399';
    return '#94a3b8';
};

export default function Notes() {
    const [user, setUser] = useState(null);
    const [notes, setNotes] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [filterSubjectId, setFilterSubjectId] = useState("");
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Upload form
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [uploadSubjectId, setUploadSubjectId] = useState("");
    const [file, setFile] = useState(null);

    // AI
    const [aiModal, setAiModal] = useState(null); // { type, note }
    const [aiLoading, setAiLoading] = useState(false);
    const [aiContent, setAiContent] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const decoded = jwtDecode(token);
            Promise.resolve().then(() => setUser(decoded));
            const notesUrl = filterSubjectId ? `${API}/notes?subjectId=${filterSubjectId}` : `${API}/notes`;
            axios.get(notesUrl, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => { setNotes(res.data || []); setLoading(false); })
                .catch(() => { setLoading(false); });
            axios.get(`${API}/user/subjects`, { headers: { Authorization: `Bearer ${token}` } })
                .then(res => setSubjects(res.data || []))
                .catch(() => { /* ignore subject fetch errors */ });

            const socket = initializeSocket(decoded.id, decoded.classId, decoded.role);
            if (socket) {
                const handleNewNote = data => {
                    setNotes(prev => prev.some(n => n._id === data.note._id) ? prev : [data.note, ...prev]);
                };
                const handleDeletedNote = id => setNotes(prev => prev.filter(n => n._id !== id));

                socket.on("note_uploaded", handleNewNote);
                socket.on("note_deleted", handleDeletedNote);

                return () => {
                    socket.off("note_uploaded", handleNewNote);
                    socket.off("note_deleted", handleDeletedNote);
                };
            }
        } catch (e) { console.error("Socket error in Notes:", e); }
    }, [filterSubjectId]);

    const fetchNotes = async (tk) => {
        try {
            const url = filterSubjectId ? `${API}/notes?subjectId=${filterSubjectId}` : `${API}/notes`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${tk}` } });
            setNotes(res.data || []);
        } catch { /* ignore refresh errors */ }
        setLoading(false);
    };

    const validateFile = (f) => {
        if (f.size > 10 * 1024 * 1024) {
            toast.error("Resource exceeds 10MB synchronization limit.");
            return false;
        }
        return true;
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return toast.info("Resource payload required.");
        if (!uploadSubjectId) return toast.info("Curriculum target required.");
        setUploading(true);
        const fd = new FormData();
        fd.append("title", title); fd.append("description", description);
        fd.append("subjectId", uploadSubjectId); fd.append("file", file);
        try {
            const tk = localStorage.getItem("token");
            await axios.post(`${API}/notes/upload`, fd, { headers: { Authorization: `Bearer ${tk}`, "Content-Type": "multipart/form-data" } });
            toast.success("Academic resource disseminated successfully.");
            setTitle(""); setDescription(""); setUploadSubjectId(""); setFile(null); setShowUpload(false);
            fetchNotes(tk);
        } catch (e) { toast.error(e.response?.data?.message || "Ingestion failed."); }
        setUploading(false);
    };

    const handleDownload = async (note) => {
        setDownloadingId(note._id);
        const tk = localStorage.getItem("token");
        try {
            // Using a new tab to handle the secure redirect from the backend. 
            // This allows the browser to trigger its native download manager.
            const downloadUrl = `${API}/notes/download/${note._id}?token=${tk}`;

            toast.success("Broadcast initiated: Handing over to browser Sync Manager.");
            window.open(downloadUrl, "_blank");

        } catch (e) {
            console.error("Secondary download failure:", e);
            const fallbackUrl = note.fileUrl.startsWith('/') ? `${API.replace('/api/v1', '')}${note.fileUrl}` : note.fileUrl;
            window.open(fallbackUrl, "_blank");
        }
        setDownloadingId(null);
    };

    const handleDelete = async (id) => {
        if (!confirm("Terminate this academic resource?")) return;
        const tk = localStorage.getItem("token");
        await axios.delete(`${API}/notes/${id}`, { headers: { Authorization: `Bearer ${tk}` } });
        setNotes(prev => prev.filter(n => n._id !== id));
        toast.success("Resource purged.");
    };

    const handleAI = async (type, note) => {
        setAiModal({ type, note }); setAiLoading(true); setAiContent(null);
        try {
            const tk = localStorage.getItem("token");
            const res = await axios.post(`${API}/ai/${type === 'explain' ? 'explain' : 'quiz'}`,
                { text: `Title: ${note.title}\nDescription: ${note.description}`, noteId: note._id },
                { headers: { Authorization: `Bearer ${tk}` } });
            setAiContent(res.data);
        } catch { setAiContent({ error: "AI cognitive synthesis unavailable." }); }
        setAiLoading(false);
    };

    const ACCENT = 'var(--c-primary)';

    if (loading) return <Spinner label="Synchronizing academic library…" />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <PageHeader
                title="Cognitive Resources"
                subtitle="High-fidelity academic materials and shared intelligence repository"
                accent={ACCENT}
                icon={BookOpen}
                right={
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <Select accent={ACCENT} value={filterSubjectId} onChange={e => setFilterSubjectId(e.target.value)} style={{ width: 'auto', minWidth: 200, height: 48 }}>
                            <option value="">Global Repository</option>
                            {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                        </Select>
                        {user?.role === 'teacher' && (
                            <Btn accent={ACCENT} onClick={() => setShowUpload(t => !t)} style={{ height: 48, minWidth: 160 }}>
                                {showUpload ? <X size={20} /> : <Upload size={18} />} {showUpload ? 'Abort' : 'Upload Matrix'}
                            </Btn>
                        )}
                    </div>
                }
            />

            {/* Upload form */}
            {showUpload && user?.role === 'teacher' && (
                <Card accent={ACCENT} style={{ animation: 'fadeUp 0.4s ease-out' }}>
                    <SectionTitle>Resource Ingestion</SectionTitle>
                    <form onSubmit={handleUpload}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
                            {/* Dropzone */}
                            <div
                                style={{
                                    border: `2px dashed ${file ? 'var(--c-primary)' : dragActive ? ACCENT : 'var(--c-border)'}`,
                                    borderRadius: 24, minHeight: 220, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative',
                                    background: file ? 'rgba(var(--c-primary-rgb), 0.05)' : dragActive ? 'rgba(var(--c-primary-rgb), 0.05)' : 'var(--c-surface)',
                                    transition: 'all 0.3s cubic-bezier(0.2, 1, 0.3, 1)',
                                }}
                                onDragEnter={() => setDragActive(true)} onDragLeave={() => setDragActive(false)}
                                onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0] && validateFile(e.dataTransfer.files[0])) setFile(e.dataTransfer.files[0]); }}
                            >
                                <input type="file" onChange={e => { if (e.target.files[0] && validateFile(e.target.files[0])) setFile(e.target.files[0]); }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }} />
                                {file ? (
                                    <div style={{ animation: 'scaleIn 0.3s cubic-bezier(0.2, 1, 0.3, 1)', textAlign: 'center' }}>
                                        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(var(--c-primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--c-primary)' }}>
                                            <CheckCircle size={32} />
                                        </div>
                                        <p style={{ fontWeight: 800, color: 'var(--c-text)', fontSize: '1rem', padding: '0 24px', margin: 0 }}>{file.name}</p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--c-primary)', fontWeight: 700, marginTop: 8 }}>{(file.size / 1024 / 1024).toFixed(2)} MB Payload</p>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <Cloud size={48} color="var(--c-muted)" style={{ marginBottom: 16, opacity: 0.5 }} />
                                        <p style={{ fontWeight: 800, color: 'var(--c-text)', fontSize: '1.1rem', margin: 0 }}>Payload Delivery</p>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--c-muted)', marginTop: 8 }}>PDF, Audio-Visual, Imagery — Max 10MB</p>
                                    </div>
                                )}
                            </div>

                            {/* Fields */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div><Label>Curriculum Spectrum</Label>
                                    <Select accent={ACCENT} value={uploadSubjectId} onChange={e => setUploadSubjectId(e.target.value)} required>
                                        <option value="">— Choose Target —</option>
                                        {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                                    </Select>
                                </div>
                                <div><Label>Resource nomenclature</Label><Input accent={ACCENT} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Molecular Dynamics - Vol. 2" required /></div>
                                <div><Label>Operational Summary</Label><Textarea accent={ACCENT} rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide high-level context…" /></div>
                                <Btn accent={ACCENT} type="submit" disabled={uploading} full style={{ height: 52 }}>
                                    {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={18} />}
                                    {uploading ? 'Ingesting Resource…' : 'Finalize Broadcast'}
                                </Btn>
                            </div>
                        </div>
                    </form>
                </Card>
            )}

            {/* Notes grid */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 6, height: 24, borderRadius: 10, background: 'var(--c-primary)' }}></div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', fontSize: '1.25rem', margin: 0 }}>Repository Index</h2>
                    </div>
                    <Badge color={ACCENT_COLOR}>{notes.length} Entities Indexed</Badge>
                </div>

                {notes.length === 0
                    ? <Card><Empty icon={File} title="Repository Empty" sub="Waiting for academic data synchronization." /></Card>
                    : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                            {notes.map((note, i) => {
                                const color = fileColor(note.fileType);
                                return (
                                    <Card key={note._id} style={{
                                        display: 'flex', flexDirection: 'column', gap: 20,
                                        animation: `fadeUp 0.4s ease-out ${i * 0.05}s`,
                                        animationFillMode: 'both'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                                            <div style={{
                                                width: 56, height: 56, borderRadius: 18,
                                                background: color + '15',
                                                border: `1px solid ${color}40`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color, flexShrink: 0,
                                                boxShadow: `0 8px 16px ${color}15`
                                            }}>
                                                {fileIcon(note.fileType)}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={() => handleAI('explain', note)} title="Cognitive Explanation" style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><Lightbulb size={18} /></button>
                                                <button onClick={() => handleAI('quiz', note)} title="Knowledge Evaluation" style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(167, 139, 250, 0.12)', border: '1px solid rgba(167, 139, 250, 0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><Brain size={18} /></button>
                                                <button onClick={() => handleDownload(note)} title="Aquire Payload" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--c-surface)', border: '1px solid var(--c-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                    {downloadingId === note._id ? <Loader2 size={16} className="animate-spin" /> : <Download size={18} />}
                                                </button>
                                                {user?.role === 'teacher' && (
                                                    <button onClick={() => handleDelete(note._id)} title="Purge Record" style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><X size={18} /></button>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            {note.subjectId?.name && <Badge color={ACCENT}>{note.subjectId.name}</Badge>}
                                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-text)', marginTop: 12, marginBottom: 8, lineHeight: 1.3 }}>{note.title}</h3>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--c-text)', opacity: 0.7, lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{note.description || 'No operational summary provided.'}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--c-border)', fontSize: '0.8rem', color: 'var(--c-muted)', fontWeight: 600 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 24, height: 24, borderRadius: 8, background: 'var(--c-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={12} />
                                                </div>
                                                {note.uploadedBy?.name || 'Academic System'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={14} /> {note.views?.length || 0}</div>
                                                <span>{new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )
                }
            </div>

            {/* AI Modal */}
            {aiModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', transition: 'all 0.3s ease' }}>
                    <div style={{
                        width: '100%', maxWidth: 720, maxHeight: '85vh',
                        background: 'var(--c-bg)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 32, display: 'flex', flexDirection: 'column',
                        overflow: 'hidden', boxShadow: '0 50px 100px rgba(0,0,0,0.8)',
                        animation: 'fadeUp 0.5s cubic-bezier(0.2, 1, 0.3, 1)'
                    }}>
                        <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to right, rgba(var(--c-primary-rgb), 0.1), transparent)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{ width: 56, height: 56, borderRadius: 18, background: aiModal.type === 'explain' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(167, 139, 250, 0.15)', border: `1px solid ${aiModal.type === 'explain' ? '#fbbf2440' : '#a78bfa40'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: aiModal.type === 'explain' ? '#fbbf24' : '#a78bfa' }}>
                                    {aiModal.type === 'explain' ? <Lightbulb size={28} /> : <Brain size={28} />}
                                </div>
                                <div>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', fontSize: '1.4rem', margin: 0 }}>
                                        {aiModal.type === 'explain' ? 'Cognitive Inferences' : 'Knowledge Evaluation'}
                                    </h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--c-muted)', fontWeight: 500, margin: 0 }}>Synthesizing: {aiModal.note.title}</p>
                                </div>
                            </div>
                            <button onClick={() => { setAiModal(null); setAiContent(null); }} style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
                            {aiLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '60px 0' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid var(--c-border)', borderTopColor: 'var(--c-primary)', animation: 'spin 1s linear infinite' }} />
                                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--c-muted)' }}>AI Cognitive Processing…</p>
                                </div>
                            ) : aiContent?.error ? (
                                <div style={{ padding: '32px', borderRadius: 24, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{aiContent.error}</div>
                            ) : aiContent?.explanation ? (
                                <div style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--c-text)', fontWeight: 500 }}>{aiContent.explanation}</div>
                            ) : aiContent?.quiz ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    {aiContent.quiz.map((q, i) => (
                                        <div key={i} style={{ padding: '28px', borderRadius: 24, background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                                            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', marginBottom: 20, fontSize: '1.1rem' }}>
                                                <span style={{ color: 'var(--c-primary)', marginRight: 12 }}>{i + 1}.</span> {q.question}
                                            </p>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                {q.options.map((opt, j) => (
                                                    <div key={j} style={{
                                                        padding: '16px 20px', borderRadius: 16, fontSize: '0.95rem', fontWeight: 600,
                                                        border: `1px solid ${opt === q.correctAnswer ? 'rgba(52, 211, 153, 0.3)' : 'var(--c-border)'}`,
                                                        background: opt === q.correctAnswer ? 'rgba(52, 211, 153, 0.1)' : 'transparent',
                                                        color: opt === q.correctAnswer ? '#34d399' : 'var(--c-text)',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        {opt}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
                @keyframes spin { to { transform:rotate(360deg); } }
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--c-border); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--c-muted); }
            `}</style>
        </div>
    );
}
