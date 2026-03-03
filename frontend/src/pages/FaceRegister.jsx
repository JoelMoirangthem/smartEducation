import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Camera, CheckCircle, X, Loader2, ScanFace, RotateCcw, Send, AlertTriangle } from 'lucide-react';
import { Card, PageHeader, Btn, Empty } from '../components/PageLayout';

const API = 'http://localhost:5000/api/v1';
const MIN = 5; const MAX = 15;
const ACCENT = '#06b6d4';

export default function FaceRegister() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [registered, setRegistered] = useState(false);
    const [regData, setRegData] = useState(null);
    const [confirm, setConfirm] = useState(false);

    const getUserId = () => {
        try { const t = localStorage.getItem('token'); const d = jwtDecode(t); return d.userId || d.id || d._id; } catch { return null; }
    };

    useEffect(() => {
        checkStatus();
        return () => stopCamera();
    }, []);

    const checkStatus = async () => {
        const userId = getUserId(); if (!userId) return;
        try {
            const tk = localStorage.getItem('token');
            const res = await axios.get(`${API}/face-attendance/check/${userId}`, { headers: { Authorization: `Bearer ${tk}` } });
            if (res.data.registered) { setRegistered(true); setRegData(res.data); setSuccess(`Face registered on ${new Date(res.data.lastUpdated || res.data.registeredAt).toLocaleDateString()}`); }
        } catch { }
    };

    const startCamera = async () => {
        try {
            const ms = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } });
            if (videoRef.current) videoRef.current.srcObject = ms;
            setStream(ms); setError('');
        } catch { setError('Camera access denied. Please allow camera permissions.'); }
    };

    const stopCamera = () => { stream?.getTracks().forEach(t => t.stop()); setStream(null); };

    const capture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        if (images.length >= MAX) { setError(`Max ${MAX} images`); return; }
        const v = videoRef.current; const c = canvasRef.current;
        c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext('2d').drawImage(v, 0, 0);
        setImages(p => [...p, c.toDataURL('image/jpeg', 0.9)]); setError('');
    };

    const remove = (i) => setImages(p => p.filter((_, j) => j !== i));

    const submit = async () => {
        if (images.length < MIN) { setError(`Capture at least ${MIN} images`); return; }
        if (registered && !confirm) { setConfirm(true); return; }
        setLoading(true); setError(''); setConfirm(false);
        try {
            const tk = localStorage.getItem('token');
            const res = await axios.post(`${API}/face-attendance/register`, { images }, { headers: { Authorization: `Bearer ${tk}` } });
            setSuccess(`${registered ? 'Updated' : 'Registered'}! ${res.data.imagesProcessed} images processed.`);
            setRegistered(true); stopCamera(); setImages([]);
            await checkStatus();
            setTimeout(() => navigate('/dashboard'), 3000);
        } catch (e) { setError(e.response?.data?.message || e.response?.data?.error || 'Registration failed'); }
        setLoading(false);
    };

    const progress = Math.round((images.length / MIN) * 100);
    const ready = images.length >= MIN;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <PageHeader
                title={registered ? 'Update Face Registration' : 'Face Registration'}
                subtitle={`Register your face for AI-powered attendance. Capture ${MIN}–${MAX} clear photos.`}
                accent={ACCENT}
                icon={ScanFace}
                right={
                    registered && <div style={{ padding: '7px 14px', borderRadius: 10, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', fontSize: '0.72rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <CheckCircle size={13} /> Already Registered
                    </div>
                }
            />

            {error && <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 10 }}><AlertTriangle size={15} /> {error}</div>}
            {success && <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 10 }}><CheckCircle size={15} /> {success}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, alignItems: 'start' }}>
                {/* Camera */}
                <Card accent={ACCENT}>
                    <h3 style={{ fontFamily: 'Space Grotesk,sans-serif', fontWeight: 700, color: 'var(--c-text)', fontSize: '0.95rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Camera size={16} color={ACCENT} /> Camera Preview
                    </h3>
                    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: 'rgba(0,0,0,0.6)', aspectRatio: '4/3', marginBottom: 14 }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        {!stream && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'rgba(255,255,255,0.3)' }}>
                                <Camera size={36} style={{ opacity: 0.4 }} />
                                <p style={{ fontSize: '0.8rem' }}>Camera not started</p>
                            </div>
                        )}
                        {stream && (
                            <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 999, padding: '4px 10px', fontSize: '0.65rem', color: 'white', fontWeight: 700 }}>
                                {images.length}/{MAX}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {!stream
                            ? <Btn accent={ACCENT} onClick={startCamera} full><Camera size={14} /> {registered ? 'Start Camera (Update)' : 'Start Camera'}</Btn>
                            : <>
                                <Btn accent={ACCENT} onClick={capture} disabled={images.length >= MAX} full><Camera size={14} /> Capture</Btn>
                                <Btn danger onClick={stopCamera}><X size={14} /></Btn>
                            </>
                        }
                    </div>

                    {/* Progress */}
                    {images.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--c-muted)', marginBottom: 6 }}>
                                <span>Progress</span><span>{images.length}/{MIN} min</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 999, background: 'var(--c-border)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: ready ? '#34d399' : ACCENT, borderRadius: 999, transition: 'width 0.3s ease' }} />
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: `var(--c-surface-hover)`, border: `1px solid var(--c-border)`, fontSize: '0.72rem', color: 'var(--c-muted)', lineHeight: 1.7 }}>
                        <p style={{ fontWeight: 700, color: 'var(--c-text)', opacity: 0.8, marginBottom: 5 }}>Tips for best results:</p>
                        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                            {['Look directly at the camera', 'Good, even lighting', 'Capture from different angles', 'Keep a neutral expression', 'No masks or sunglasses'].map((t, i) => (
                                <li key={i} style={{ paddingLeft: 14, position: 'relative', marginBottom: 2 }}><span style={{ position: 'absolute', left: 0, color: ACCENT }}>·</span>{t}</li>
                            ))}
                        </ul>
                    </div>
                </Card>

                {/* Captures */}
                <Card accent={ACCENT} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontFamily: 'Space Grotesk,sans-serif', fontWeight: 700, color: 'var(--c-text)', fontSize: '0.95rem' }}>Captured Photos</h3>
                        <span style={{ fontSize: '0.7rem', color: 'var(--c-muted)', background: 'var(--c-surface-hover)', padding: '2px 10px', borderRadius: 999 }}>{images.length} photos</span>
                    </div>

                    {images.length === 0
                        ? <Empty icon={Camera} title="No photos yet" sub={`Capture at least ${MIN} photos`} />
                        : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                                {images.map((img, i) => (
                                    <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                                        <img src={img} alt={`Capture ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                                        <button onClick={() => remove(i)} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <X size={11} color="white" />
                                        </button>
                                        <div style={{ position: 'absolute', bottom: 2, left: 4, fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>#{i + 1}</div>
                                    </div>
                                ))}
                            </div>
                        )
                    }

                    {!ready && images.length > 0 && (
                        <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', textAlign: 'center', fontSize: '0.75rem', color: '#fbbf24' }}>
                            Need {MIN - images.length} more photo{MIN - images.length !== 1 ? 's' : ''}
                        </div>
                    )}

                    {ready && (
                        <Btn accent={ACCENT} onClick={submit} disabled={loading} full>
                            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                            {loading ? 'Processing…' : registered ? 'Update Registration' : 'Submit Registration'}
                        </Btn>
                    )}
                </Card>
            </div>

            {/* Confirm dialog */}
            {confirm && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div style={{ width: '100%', maxWidth: 420, background: 'rgba(10,12,30,0.97)', border: `2px solid rgba(251,191,36,0.35)`, borderRadius: 22, padding: 28 }}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AlertTriangle size={24} color="#fbbf24" />
                            </div>
                            <h3 style={{ fontFamily: 'Space Grotesk,sans-serif', fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: 8 }}>Update Face Registration?</h3>
                            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>This will replace all your existing face data with the new photos. This action cannot be undone.</p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <Btn ghost onClick={() => setConfirm(false)} style={{ flex: 1 }}>Cancel</Btn>
                            <Btn accent="#fbbf24" onClick={submit} style={{ flex: 1 }}>Yes, Update</Btn>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}
