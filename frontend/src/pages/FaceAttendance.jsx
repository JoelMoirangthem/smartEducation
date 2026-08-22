import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { initializeSocket, getSocket, disconnectSocket } from '../services/socket.service';
import { Video, Play, Square, Download, Users, Clock, CheckCircle, Loader2, AlertCircle, ScanFace } from 'lucide-react';
import { toast } from 'react-toastify';
import { Card, PageHeader, Spinner, Btn, Empty } from '../components/PageLayout';

const ACCENT = '#06b6d4';

export default function FaceAttendance() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const intervalRef = useRef(null);
    // Mirror of the MediaStream — state closures go stale in the unmount cleanup
    const streamRef = useRef(null);

    const [stream, setStream] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [attendanceList, setAttendanceList] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastRecognized, setLastRecognized] = useState(null);
    const [scanCount, setScanCount] = useState(0);
    const [showSessionForm, setShowSessionForm] = useState(false);
    const [sessionForm, setSessionForm] = useState({ subjectId: '', classId: '' });
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses] = useState([]);

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setStream(null);
    };

    const stopScan = () => {
        clearInterval(intervalRef.current); intervalRef.current = null; setIsScanning(false); setScanCount(0);
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user?.id) return;
        initializeSocket(user.id, user.classId, user.role);

        const socket = getSocket();
        socket.on('attendance_update', data => {
            setAttendanceList(prev => prev.find(x => x.studentId === data.studentId) ? prev : [data, ...prev]);
            toast.success(`${data.studentName} identified and logged.`);
        });
        api.get('/attendance/stats')
            .then(res => {
                if (res.data.isActive) { setSessionId(res.data.sessionId); setAttendanceList(res.data.students || []); }
            })
            .catch(() => { /* no active session */ });

        return () => {
            stopCamera(); stopScan();
            // Only remove our listener, don't disconnect the shared socket
            const s = getSocket();
            if (s) s.off('attendance_update');
        };
        // stopCamera/stopScan are one-time cleanup helpers; socket + session load intentionally run once
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openSessionForm = async () => {
        setShowSessionForm(true);
        // Fetch subjects and classes for the form
        try {
            const [subRes, clsRes] = await Promise.all([
                api.get('/user/subjects').catch(() => ({ data: [] })),
                api.get('/user/classes').catch(() => ({ data: [] }))
            ]);
            setSubjects(subRes.data || []);
            setClasses(clsRes.data || []);
        } catch { /* ignore */ }
    };

    const startSession = async () => {
        const { subjectId, classId } = sessionForm;
        if (!subjectId || !classId) { setError('Subject and class are required'); return; }
        setLoading(true); setShowSessionForm(false); setError('');
        try {
            const res = await api.post('/attendance/start', { subjectId, classId });
            setSessionId(res.data.sessionId); setAttendanceList([]);
            await startCamera();
            toast.success('Attendance synchronization active.');
        } catch (e) { setError(e.response?.data?.message || 'Failed to initialize session'); }
        setLoading(false);
    };

    const endSession = async () => {
        setLoading(true);
        try {
            await api.post('/attendance/end', {});
            setSessionId(null); stopCamera(); stopScan();
            toast.info('Attendance session terminated.');
        } catch (e) { setError(e.response?.data?.message || 'Failed to terminate session'); }
        setLoading(false);
    };

    const startCamera = async () => {
        try {
            const ms = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } });
            streamRef.current = ms;
            if (videoRef.current) videoRef.current.srcObject = ms;
            setStream(ms);
        } catch { setError('Visual input access denied. Please verify hardware permissions.'); }
    };

    const captureFrame = () => {
        if (!videoRef.current || !canvasRef.current) return null;
        const v = videoRef.current; const c = canvasRef.current;
        c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext('2d').drawImage(v, 0, 0);
        return c.toDataURL('image/jpeg', 0.82);
    };

    const startScan = () => {
        if (!sessionId || !stream) { setError('Initialize session and visual input first'); return; }
        setIsScanning(true); setScanCount(0); setLastRecognized(null); setError('');
        let inFlight = false;
        intervalRef.current = setInterval(async () => {
            if (inFlight) return; // skip tick if previous request hasn't completed
            const frame = captureFrame(); if (!frame) return;
            setScanCount(p => p + 1);
            inFlight = true;
            try {
                const res = await api.post('/face-attendance/mark', { sessionId, image: frame });
                if (res.data.recognized && !res.data.alreadyProcessing) {
                    setLastRecognized({ name: res.data.student?.name, confidence: res.data.confidence, time: new Date() });
                }
            } catch { /* frame rejected or face not matched */ }
            finally { inFlight = false; }
        }, 500);
    };

    const exportCSV = async () => {
        if (!sessionId) return;
        try {
            const res = await api.get(`/attendance/session/${sessionId}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a'); a.href = url;
            a.download = `attendance-index-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a); a.click(); a.remove();
            toast.success('Attendance index exported.');
        } catch { setError('Data export failure'); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <PageHeader
                title="Face Identity Protocol"
                subtitle="Biometric synchronization for automatic academic presence verification"
                accent={ACCENT}
                icon={ScanFace}
                right={
                    !sessionId
                        ? <Btn accent={ACCENT} onClick={openSessionForm} disabled={loading} style={{ height: 48, minWidth: 180 }}>
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <Play size={18} />} INITIALIZE SESSION
                        </Btn>
                        : <div style={{ display: 'flex', gap: 12 }}>
                            <Btn accent="#ef4444" onClick={endSession} disabled={loading} style={{ height: 48 }}><Square size={16} /> TERMINATE</Btn>
                            <Btn ghost onClick={exportCSV} style={{ height: 48 }}><Download size={18} /> DATA EXPORT</Btn>
                        </div>
                }
            />

            {/* Error Broadcast */}
            {error && (
                <div style={{
                    padding: '16px 20px', borderRadius: 18,
                    background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.9rem', color: '#ef4444',
                    fontWeight: 600, animation: 'fadeUp 0.3s ease-out'
                }}>
                    <AlertCircle size={20} /> <span style={{ letterSpacing: '0.02em' }}>{error.toUpperCase()}</span>
                </div>
            )}

            {/* Identity recognition feedback */}
            {lastRecognized && (
                <div style={{
                    padding: '20px 24px', borderRadius: 24,
                    background: 'var(--c-card-bg)', border: `1px solid ${ACCENT}40`,
                    display: 'flex', alignItems: 'center', gap: 24,
                    boxShadow: `0 20px 40px ${ACCENT}15`,
                    animation: 'fadeUp 0.4s cubic-bezier(0.2, 1, 0.3, 1)',
                    backdropFilter: 'blur(20px)'
                }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: ACCENT + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT }}>
                        <ScanFace size={28} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ color: 'var(--c-text)', fontWeight: 800, fontSize: '1.1rem', margin: 0, letterSpacing: '-0.01em' }}>Identity Verified: {lastRecognized.name}</p>
                        <p style={{ color: 'var(--c-muted)', fontSize: '0.85rem', fontWeight: 600, marginTop: 4 }}>
                            Biometric Precision: <span style={{ color: ACCENT }}>{lastRecognized.confidence?.toFixed(2)}%</span> · Synced at {lastRecognized.time?.toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, alignItems: 'start' }}>
                {/* Visual Processing Unit */}
                <Card accent={ACCENT} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT }}>
                            <Video size={20} />
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', fontSize: '1.2rem', margin: 0 }}>Visual Matrix</h3>
                        {isScanning && (
                            <div style={{
                                marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 800, color: '#ef4444',
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '4px 12px', borderRadius: 12, letterSpacing: '0.08em'
                            }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444', animation: 'pulse 1.2s infinite' }} />
                                PROCESSING ({scanCount})
                            </div>
                        )}
                    </div>

                    <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', background: 'black', aspectRatio: '16/10', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', border: '1px solid var(--c-border)' }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: stream ? 1 : 0, transition: 'opacity 0.5s ease' }} />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />

                        {/* Scanning Overlay Effect */}
                        {isScanning && (
                            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, transparent, ${ACCENT}, transparent)`, boxShadow: `0 0 20px 4px ${ACCENT}`, animation: 'scanline 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />
                                <div style={{ position: 'absolute', inset: '15%', border: `1px solid ${ACCENT}40`, borderRadius: 20 }}>
                                    <div style={{ position: 'absolute', top: -2, left: -2, width: 24, height: 24, borderTop: `4px solid ${ACCENT}`, borderLeft: `4px solid ${ACCENT}`, borderRadius: '4px 0 0 0' }} />
                                    <div style={{ position: 'absolute', top: -2, right: -2, width: 24, height: 24, borderTop: `4px solid ${ACCENT}`, borderRight: `4px solid ${ACCENT}`, borderRadius: '0 4px 0 0' }} />
                                    <div style={{ position: 'absolute', bottom: -2, left: -2, width: 24, height: 24, borderBottom: `4px solid ${ACCENT}`, borderLeft: `4px solid ${ACCENT}`, borderRadius: '0 0 0 4px' }} />
                                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderBottom: `4px solid ${ACCENT}`, borderRight: `4px solid ${ACCENT}`, borderRadius: '0 0 4px 0' }} />
                                </div>
                            </div>
                        )}

                        {!stream && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--c-muted)', background: 'var(--c-surface)' }}>
                                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                                    <Video size={32} />
                                </div>
                                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>{sessionId ? 'ACTIVATE VISUAL INPUT' : 'SESSION NOT INITIALIZED'}</p>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {!stream && sessionId && (
                            <Btn accent={ACCENT} onClick={startCamera} full style={{ height: 50, fontWeight: 800 }}>ACTIVATE MATRIX</Btn>
                        )}
                        {stream && sessionId && (
                            <Btn accent={isScanning ? '#fbbf24' : ACCENT} onClick={isScanning ? stopScan : startScan} full style={{ height: 50, fontWeight: 800 }}>
                                {isScanning ? <><Square size={16} /> HALT PROCESSING</> : <><Play size={16} /> INITIALIZE SCAN</>}
                            </Btn>
                        )}
                    </div>

                    {/* Operational Protocols */}
                    <div style={{
                        padding: '24px', borderRadius: 20,
                        background: `rgba(var(--c-primary-rgb), 0.03)`,
                        border: `1px dashed ${ACCENT}40`,
                        fontSize: '0.85rem', color: 'var(--c-text)', lineHeight: 1.8
                    }}>
                        <p style={{ fontWeight: 800, color: 'var(--c-text)', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Operational Protocols:</p>
                        <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0, opacity: 0.8, fontWeight: 500 }}>
                            {[
                                'Establish session architecture and activate visual matrix.',
                                'Ensure subjects are within the biometric focal frame.',
                                'Processing operates at a 500ms temporal frequency.',
                                'Identity verification is instantly disseminated via socket protocol.',
                                'Temporal cooldown prevents redundant biometric logging.'
                            ].map((s, i) => (
                                <li key={i} style={{ paddingLeft: 18, position: 'relative', marginBottom: 6 }}>
                                    <span style={{ position: 'absolute', left: 0, color: ACCENT, fontWeight: 900 }}>»</span>{s}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>

                {/* Identity Stream */}
                <Card accent={ACCENT} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT }}>
                                <Users size={20} />
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', fontSize: '1.2rem', margin: 0 }}>Verified Personas</h3>
                        </div>
                        <div style={{
                            fontSize: '0.85rem', fontWeight: 900, color: ACCENT,
                            background: ACCENT + '15', border: `1px solid ${ACCENT}30`,
                            padding: '4px 16px', borderRadius: 12
                        }}>
                            {attendanceList.length}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 600, overflowY: 'auto', paddingRight: 4 }} className="custom-scrollbar">
                        {attendanceList.length === 0
                            ? <Empty icon={Users} title="Sync Pending" sub="Identities will emerge here upon biometric verification." />
                            : attendanceList.map((s, i) => (
                                <div key={s.studentId || i} style={{
                                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                                    borderRadius: 20, background: 'var(--c-surface)',
                                    border: '1px solid var(--c-border)',
                                    animation: 'fadeUp 0.4s cubic-bezier(0.2, 1, 0.3, 1)',
                                    transition: 'all 0.3s ease'
                                }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#34d39960'; e.currentTarget.style.background = 'rgba(52, 211, 153, 0.05)'; }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 14, background: ACCENT + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: ACCENT, flexShrink: 0 }}>
                                        {s.studentName?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 800, color: 'var(--c-text)', fontSize: '1rem', margin: 0 }}>{s.studentName}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--c-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={12} /> {new Date(s.markedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                            {s.confidence && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>{s.confidence?.toFixed(1)}% ACC</span>}
                                        </div>
                                    </div>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#10b98120', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                        <CheckCircle size={18} />
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </Card>
            </div>

            {/* Session Initiation Form Modal */}
            {showSessionForm && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                    <div style={{ width: '100%', maxWidth: 440, background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 20, padding: 28 }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--c-text)', marginBottom: 20 }}>Initialize Attendance Session</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Subject</label>
                                <select
                                    value={sessionForm.subjectId}
                                    onChange={e => setSessionForm(p => ({ ...p, subjectId: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-text)', fontSize: '0.85rem', outline: 'none' }}
                                >
                                    <option value="">Select a subject...</option>
                                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Class</label>
                                <select
                                    value={sessionForm.classId}
                                    onChange={e => setSessionForm(p => ({ ...p, classId: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-text)', fontSize: '0.85rem', outline: 'none' }}
                                >
                                    <option value="">Select a class...</option>
                                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button onClick={() => setShowSessionForm(false)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid var(--c-border)', background: 'transparent', color: 'var(--c-muted)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={startSession} disabled={loading || !sessionForm.subjectId || !sessionForm.classId} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: ACCENT, color: 'white', fontWeight: 700, cursor: 'pointer', opacity: (!sessionForm.subjectId || !sessionForm.classId) ? 0.5 : 1 }}>Start Session</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scanline { 
                    0% { top: 15%; opacity: 0; } 
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 85%; opacity: 0; } 
                }
                @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.6; } }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--c-border); borderRadius: 10px; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
