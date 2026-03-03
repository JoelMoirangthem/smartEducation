import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import VideoFaceRecognition from '../components/VideoFaceRecognition';
import { CheckCircle, Users, Clock, ArrowLeft, Square, Loader2, ScanFace } from 'lucide-react';
import { Card, PageHeader, Spinner, Btn, Empty } from '../components/PageLayout';

const API = 'http://localhost:5000/api/v1';
const ACCENT = '#06b6d4';

export default function VideoAttendance() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [attendanceList, setAttendanceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSession();
        fetchAttendance();
    }, [sessionId]);

    const fetchSession = async () => {
        try {
            const tk = localStorage.getItem('token');
            const res = await axios.get(`${API}/attendance/session/${sessionId}`, { headers: { Authorization: `Bearer ${tk}` } });
            setSession(res.data);
        } catch { setError('Failed to load session'); }
        setLoading(false);
    };

    const fetchAttendance = async () => {
        try {
            const tk = localStorage.getItem('token');
            const res = await axios.get(`${API}/attendance/session/${sessionId}/records`, { headers: { Authorization: `Bearer ${tk}` } });
            setAttendanceList(res.data.records || []);
        } catch { }
    };

    const handleMarked = (result) => setAttendanceList(p => [{ student: result.student, markedAt: result.markedAt, confidence: result.confidence, attendanceType: 'face' }, ...p]);

    const endSession = async () => {
        try {
            const tk = localStorage.getItem('token');
            await axios.post(`${API}/attendance/end`, { sessionId }, { headers: { Authorization: `Bearer ${tk}` } });
            navigate('/dashboard');
        } catch { setError('Failed to end session'); }
    };

    if (loading) return <Spinner label="Loading session…" />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <PageHeader
                title="Video Face Recognition"
                subtitle={session ? `${session.subject || 'Session'} · ${new Date(session.startTime).toLocaleString()}` : 'Live attendance session'}
                accent={ACCENT}
                icon={ScanFace}
                right={
                    <div style={{ display: 'flex', gap: 10 }}>
                        <Btn ghost onClick={() => navigate('/dashboard')}><ArrowLeft size={14} /> Dashboard</Btn>
                        <Btn accent="#ef4444" onClick={endSession}><Square size={14} /> End Session</Btn>
                    </div>
                }
            />

            {error && <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '0.82rem' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20, alignItems: 'start' }}>
                {/* Video recognition component */}
                <div style={{ flex: 2 }}>
                    <VideoFaceRecognition sessionId={sessionId} onAttendanceMarked={handleMarked} />
                </div>

                {/* Attendance list */}
                <Card accent={ACCENT}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Users size={16} color={ACCENT} />
                            <h3 style={{ fontFamily: 'Space Grotesk,sans-serif', fontWeight: 700, color: 'var(--c-text)', fontSize: '0.95rem' }}>Attendance List</h3>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT, background: `rgba(6,182,212,0.1)`, border: `1px solid rgba(6,182,212,0.2)`, padding: '2px 10px', borderRadius: 999 }}>
                            {attendanceList.length}
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                        {attendanceList.length === 0
                            ? <Empty icon={Users} title="No attendance yet" sub="Recognized students will appear here" />
                            : attendanceList.map((rec, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)' }}>
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.84rem', color: ACCENT, flexShrink: 0 }}>
                                        {(rec.student?.name || '?').charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 600, color: 'var(--c-text)', fontSize: '0.86rem' }}>{rec.student?.name || 'Unknown'}</p>
                                        <p style={{ fontSize: '0.68rem', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <Clock size={9} /> {new Date(rec.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    {rec.confidence && (
                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: ACCENT, background: `rgba(6,182,212,0.1)`, border: `1px solid rgba(6,182,212,0.2)`, padding: '2px 7px', borderRadius: 999 }}>
                                            {rec.confidence}%
                                        </span>
                                    )}
                                    <CheckCircle size={14} color="#34d399" />
                                </div>
                            ))
                        }
                    </div>
                </Card>
            </div>
        </div>
    );
}
