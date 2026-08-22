import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { jwtDecode } from "jwt-decode";
import { initializeSocket, disconnectSocket } from "../services/socket.service";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import {
    QrCode, Scan, Users, CheckCircle, AlertCircle, Camera,
    Upload, X, Download, Clock, Wifi, WifiOff, Play, Square
} from "lucide-react";
import { Card, PageHeader, Spinner, Btn, Select, Label, Empty, Badge } from "../components/PageLayout";

import api from '../services/api';
const API = api.defaults.baseURL;
const ACCENT = "#34d399"; // green for attendance

export default function Attendance() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [session, setSession] = useState(null);
    const [studentList, setStudentList] = useState([]);
    const [studentStats, setStudentStats] = useState([]);
    const [scanResult, setScanResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [deviceId, setDeviceId] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);
    const scannerRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        FingerprintJS.load().then(fp => fp.get()).then(r => setDeviceId(r.visitorId));
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const decoded = jwtDecode(token);
            const socket = initializeSocket(decoded.id, decoded.classId, decoded.role);
            Promise.resolve().then(() => setUser(decoded));
            socket.on("connect", () => setSocketConnected(true));
            socket.on("disconnect", () => setSocketConnected(false));

            if (decoded.role === "teacher") {
                axios.get(`${API}/user/subjects`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(res => res.data || [])
                    .then(subs => {
                        setSubjects(subs);
                        axios.get(`${API}/attendance/stats`, { headers: { Authorization: `Bearer ${token}` } })
                            .then(res => {
                                if (res.data.isActive) {
                                    const sData = res.data;
                                    const sub = subs.find(s => s._id === (sData.subjectId?._id || sData.subjectId));

                                    setSession({
                                        ...sData,
                                        subjectName: sub?.name || 'Session Active',
                                        className: sub?.classId ? `${sub.classId.name} | Section ${sub.classId.section}` : null
                                    });
                                    setStudentList((sData.students || []).map(r => ({
                                        ...r,
                                        timeLabel: new Date(r.markedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    })));
                                    setSelectedSubjectId(sData.subjectId?._id || sData.subjectId);
                                }
                            })
                            .catch(() => { /* no active session */ });
                        if (subs && subs.length === 1) setSelectedSubjectId(subs[0]._id);
                    })
                    .catch(error => console.error("[Frontend Debug] Failed to fetch subjects:", error));

                socket.on("attendance_update", data => {
                    setStudentList(prev => {
                        const withTime = {
                            ...data,
                            timeLabel: new Date(data.markedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        };
                        return prev.some(s => s.studentId === data.studentId) ? prev : [withTime, ...prev];
                    });
                    setSession(prev => prev ? { ...prev, count: (prev.count || 0) + 1 } : prev);
                });
            } else {
                axios.get(`${API}/attendance/student-stats`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(res => setStudentStats(res.data || []))
                    .catch(error => console.error("Failed to fetch student stats:", error));
            }
            Promise.resolve().then(() => setLoading(false));
            return () => { socket.off("attendance_update"); disconnectSocket(); };
        } catch { Promise.resolve().then(() => setLoading(false)); }
    }, []);

    const startSession = async () => {
        if (!selectedSubjectId) return alert("Select a subject first");
        const subject = subjects.find(s => s._id === selectedSubjectId);
        try {
            setLoading(true);
            const tk = localStorage.getItem("token");
            const res = await axios.post(`${API}/attendance/start`, { subjectId: selectedSubjectId, classId: subject?.classId?._id || subject?.classId }, { headers: { Authorization: `Bearer ${tk}` } });
            setSession({
                ...res.data,
                count: 0,
                subjectName: subject?.name,
                className: subject?.classId ? `${subject.classId.name} | Section ${subject.classId.section}` : null
            });
            setStudentList([]);
        } catch (e) { alert(e.response?.data?.message || "Failed"); }
        setLoading(false);
    };

    const endSession = async () => {
        try {
            setLoading(true);
            const tk = localStorage.getItem("token");
            await axios.post(`${API}/attendance/end`, {}, { headers: { Authorization: `Bearer ${tk}` } });
            setSession(null); setStudentList([]);
        } catch { alert("Failed to end session"); }
        setLoading(false);
    };

    const exportCSV = async () => {
        try {
            const tk = localStorage.getItem("token");
            const res = await axios.get(`${API}/attendance/session/${session.sessionId}/export`, { headers: { Authorization: `Bearer ${tk}` }, responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a'); a.href = url;
            a.download = `Attendance_${session.subjectName}_${new Date().toLocaleDateString()}.csv`;
            document.body.appendChild(a); a.click(); a.remove();
        } catch { alert("Export failed"); }
    };

    useEffect(() => () => { scannerRef.current?.stop().catch(() => { }); }, []);

    const handleCameraScan = async () => {
        setIsScanning(true); setScanResult(null);
        try {
            const qr = new Html5Qrcode("reader"); scannerRef.current = qr;
            await qr.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
                txt => { handleScanSuccess(txt); stopCamera(); }, () => { });
        } catch { setScanResult({ success: false, message: "Camera access denied." }); setIsScanning(false); }
    };
    const stopCamera = async () => {
        if (scannerRef.current) { try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch { /* already stopped */ } }
        setIsScanning(false);
    };
    const handleFileUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try { const txt = await new Html5Qrcode("reader").scanFile(file, true); handleScanSuccess(txt); }
        catch { setScanResult({ success: false, message: "Could not read QR from image." }); }
    };
    const handleScanSuccess = async (txt) => {
        if (!deviceId) { setScanResult({ success: false, message: "Initializing device…" }); return; }
        try {
            const tk = localStorage.getItem("token");
            const res = await axios.post(`${API}/attendance/mark`, { sessionId: txt, deviceId }, { headers: { Authorization: `Bearer ${tk}` } });
            setScanResult({ success: true, message: res.data.message });
        } catch (e) { setScanResult({ success: false, message: e.response?.data?.message || "Failed" }); }
    };

    if (loading) return <Spinner label="Loading attendance…" />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <PageHeader
                title="Secure Attendance"
                subtitle={user?.role === 'teacher' ? 'Orchestrate live attendance sessions for your academic cohorts' : 'Verify your presence by scanning the synchronized session QR'}
                accent={ACCENT}
                icon={QrCode}
                right={
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 20px',
                        borderRadius: 16,
                        background: socketConnected ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${socketConnected ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        boxShadow: socketConnected ? '0 0 25px rgba(52,211,153,0.1)' : 'none',
                        backdropFilter: 'blur(10px)'
                    }}>
                        {socketConnected ? <Wifi size={16} className="animate-pulse" color="#34d399" /> : <WifiOff size={16} color="#f87171" />}
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em', color: socketConnected ? '#34d399' : '#f87171' }}>{socketConnected ? 'LIVE' : 'OFFLINE'}</span>
                    </div>
                }
            />

            {user?.role === "teacher" ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 32 }}>
                    {/* Control Panel */}
                    <Card accent={ACCENT} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {!session ? (
                            <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                <div style={{
                                    width: 90,
                                    height: 90,
                                    borderRadius: 24,
                                    background: 'var(--c-surface)',
                                    border: `1px solid var(--c-border)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 28px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
                                }}>
                                    <QrCode size={44} color={ACCENT} />
                                </div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--c-text)', marginBottom: 8 }}>Initiate Session</h3>
                                <p style={{ fontSize: '0.95rem', color: 'var(--c-muted)', marginBottom: 32, fontWeight: 500 }}>Select a target class to generate a secure enrollment matrix</p>

                                <div style={{ textAlign: 'left', marginBottom: 28 }}>
                                    <Label>Academic Target</Label>
                                    <Select accent={ACCENT} value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} style={{ height: 52 }}>
                                        <option value="">— Target Subject —</option>
                                        {Object.entries(subjects.reduce((acc, s) => {
                                            const key = s.classId ? `${s.classId.name} | Section ${s.classId.section}` : "Special Curriculum";
                                            if (!acc[key]) acc[key] = [];
                                            acc[key].push(s);
                                            return acc;
                                        }, {})).map(([group, list]) => (
                                            <optgroup key={group} label={group.toUpperCase()} style={{ background: 'var(--c-bg)', color: ACCENT }}>
                                                {list.map(s => (
                                                    <option key={s._id} value={s._id} style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}>
                                                        {s.name} ({s.code || 'CORE'})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </Select>
                                </div>

                                <Btn accent={ACCENT} onClick={startSession} full disabled={!selectedSubjectId} style={{ height: 52 }}>
                                    <Play size={18} /> Deploy Session
                                </Btn>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                <div style={{
                                    background: 'white',
                                    padding: 24,
                                    borderRadius: 32,
                                    display: 'inline-block',
                                    marginBottom: 28,
                                    boxShadow: `0 30px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)`,
                                    width: '100%',
                                    maxWidth: 280,
                                    aspectRatio: '1/1'
                                }}>
                                    <QRCodeSVG value={session.sessionId} size="100%" />
                                </div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--c-text)', marginBottom: 4 }}>{session.subjectName || 'Session Active'}</h3>
                                {session.className && (
                                    <Badge color={ACCENT}>{session.className}</Badge>
                                )}
                                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-muted)', marginTop: 12, marginBottom: 28, letterSpacing: '0.08em' }}>ID: {session.sessionId}</p>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 16,
                                    padding: '24px',
                                    borderRadius: 24,
                                    background: 'var(--c-surface)',
                                    border: `1px solid var(--c-border)`,
                                    marginBottom: 32
                                }}>
                                    <div style={{ width: 52, height: 52, borderRadius: 16, background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Users size={28} color={ACCENT} />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--c-text)', lineHeight: 1, display: 'block' }}>{session.count || 0}</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Present Now</span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <Btn danger onClick={endSession} full><X size={18} /> Terminate</Btn>
                                    <Btn ghost onClick={exportCSV} full><Download size={18} /> Matrix</Btn>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Live feed */}
                    <Card accent={ACCENT} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', fontSize: '1.25rem', margin: 0 }}>Live Transmission</h3>
                            <Badge color={ACCENT}>{studentList.length} Authenticated</Badge>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 500, display: 'flex', flexDirection: 'column', gap: 12 }} className="custom-scrollbar">
                            {studentList.length === 0
                                ? <Empty icon={Scan} title="No Incoming Signals" sub="Waiting for student QR synchronizations..." />
                                : studentList.map((r, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                                        borderRadius: 20, background: 'var(--c-surface)',
                                        border: '1px solid var(--c-border)',
                                        animation: 'fadeUp 0.3s ease-out'
                                    }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 14,
                                            background: `linear-gradient(135deg, ${ACCENT}, #34d39999)`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1rem', fontWeight: 800, color: 'white', flexShrink: 0,
                                            boxShadow: `0 8px 15px ${ACCENT}22`
                                        }}>
                                            {r.studentName?.charAt(0) || '?'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>{r.studentName}</p>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--c-muted)', margin: 0, fontWeight: 500 }}>Successfully Authenticated</p>
                                        </div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--c-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Clock size={14} />{r.timeLabel}
                                        </span>
                                    </div>
                                ))
                            }
                        </div>
                    </Card>
                </div>
            ) : (
                /* STUDENT VIEW */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {/* ── OVERVIEW & ACTIONS ── */}
                    {studentStats.length > 0 && (() => {
                        const totalPresent = studentStats.reduce((acc, s) => acc + (s.present || 0), 0);
                        const totalSessions = studentStats.reduce((acc, s) => acc + (s.total || 0), 0);
                        const avgPct = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;
                        const overallColor = avgPct >= 75 ? '#34d399' : avgPct >= 50 ? '#fbbf24' : '#f87171';

                        return (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
                                {/* Grand Total Indicator */}
                                <Card accent={overallColor} style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '40px' }}>
                                    <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                                        <svg width="120" height="120" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--c-surface)" strokeWidth="8" />
                                            <circle cx="50" cy="50" r="44" fill="none" stroke={overallColor} strokeWidth="8"
                                                strokeDasharray="276" strokeDashoffset={276 - (276 * avgPct / 100)}
                                                strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                        </svg>
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900, color: 'var(--c-text)' }}>
                                            {avgPct}%
                                        </div>
                                    </div>
                                    <div>
                                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--c-text)', marginBottom: 6 }}>Academic Standing</h3>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--c-muted)', marginBottom: 16, fontWeight: 500 }}>Your aggregate presence across the curriculum</p>
                                        <div style={{ display: 'flex', gap: 24 }}>
                                            <div>
                                                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>Present</p>
                                                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', margin: 0 }}>{totalPresent}</p>
                                            </div>
                                            <div style={{ paddingLeft: 24, borderLeft: '1px solid var(--c-border)' }}>
                                                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>Total Matrix</p>
                                                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-text)', margin: 0 }}>{totalSessions}</p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Mark Attendance Actions Card */}
                                <Card accent={ACCENT} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
                                    <div style={{
                                        width: 80, height: 80, borderRadius: 24,
                                        background: 'var(--c-surface)', border: `1px solid var(--c-border)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
                                    }}>
                                        <Scan size={36} color={ACCENT} />
                                    </div>
                                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--c-text)', marginBottom: 8 }}>Verify Presence</h2>
                                    <p style={{ fontSize: '0.95rem', color: 'var(--c-muted)', marginBottom: 32, maxWidth: '280px', lineHeight: 1.5, fontWeight: 500 }}>
                                        Synchronize with the session QR to mark your attendance
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: '300px' }}>
                                        <Btn accent={ACCENT} onClick={handleCameraScan} full style={{ height: 50 }}>
                                            <Camera size={18} /> Optical Scan
                                        </Btn>
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
                                        <Btn ghost onClick={() => fileInputRef.current?.click()} full style={{ height: 50 }}>
                                            <Upload size={18} /> Upload Image
                                        </Btn>
                                    </div>
                                </Card>
                            </div>
                        );
                    })()}

                    {/* ── INTERACTIVE AREA (SCANNER/RESULT) ── */}
                    {(isScanning || scanResult) && (
                        <div style={{ maxWidth: 550, margin: '0 auto', width: '100%', animation: 'fadeUp 0.4s ease-out' }}>
                            <Card accent={scanResult ? (scanResult.success ? '#34d399' : '#ef4444') : ACCENT} style={{ textAlign: 'center', padding: '32px' }}>
                                {isScanning && (
                                    <div>
                                        <div id="reader" style={{ borderRadius: 24, overflow: 'hidden', border: `3px solid var(--c-border)`, marginBottom: 24, background: '#000', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} />
                                        <Btn danger onClick={stopCamera} full><X size={18} /> Abort Operation</Btn>
                                    </div>
                                )}
                                {scanResult && (
                                    <div style={{ padding: '10px 0' }}>
                                        <div style={{
                                            width: 80, height: 80, borderRadius: '50%',
                                            background: scanResult.success ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            margin: '0 auto 24px', border: `2px solid ${scanResult.success ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`
                                        }}>
                                            {scanResult.success ? <CheckCircle size={40} color="#34d399" /> : <AlertCircle size={40} color="#f87171" />}
                                        </div>
                                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--c-text)', marginBottom: 12 }}>
                                            {scanResult.success ? 'Verification Successful' : 'Verification Refused'}
                                        </h3>
                                        <p style={{ fontSize: '1rem', color: 'var(--c-muted)', marginBottom: 32, lineHeight: 1.6, fontWeight: 500 }}>{scanResult.message}</p>
                                        <Btn ghost onClick={() => { setScanResult(null); setIsScanning(false); }} full style={{ height: 50 }}>Acknowledge</Btn>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* ── SUBJECT WISE ANALYTICS ── */}
                    {studentStats.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                                <div style={{ width: 6, height: 32, borderRadius: 10, background: ACCENT }}></div>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--c-text)', fontSize: '1.5rem', margin: 0 }}>Curriculum Analytics</h2>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
                                {studentStats.map(stat => {
                                    const pct = stat.percentage || 0;
                                    const color = pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171';
                                    return (
                                        <Card key={stat.subjectId} accent={color} style={{ padding: '32px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                                                <div>
                                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--c-text)', marginBottom: 4 }}>{stat.subjectName}</h4>
                                                    <Badge color={color}>{stat.subjectCode || 'CORE'}</Badge>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color, display: 'block' }}>{pct}%</span>
                                                </div>
                                            </div>

                                            <div style={{ width: '100%', height: 8, background: 'var(--c-surface)', borderRadius: 10, marginBottom: 24, overflow: 'hidden', border: '1px solid var(--c-border)' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}dd, ${color})`, borderRadius: 10, transition: 'width 1.5s cubic-bezier(0.2, 1, 0.3, 1)' }}></div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', gap: 24 }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--c-muted)', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present</span>
                                                        <span style={{ fontSize: '1.1rem', color: 'var(--c-text)', fontWeight: 800 }}>{stat.present}</span>
                                                    </div>
                                                    <div style={{ paddingLeft: 24, borderLeft: '1px solid var(--c-border)' }}>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--c-muted)', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Matrix</span>
                                                        <span style={{ fontSize: '1.1rem', color: 'var(--c-muted)', fontWeight: 800 }}>{stat.total}</span>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: 14,
                                                    background: color + '12', border: `1px solid ${color}25`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: `0 8px 15px ${color}15`
                                                }}>
                                                    <Clock size={18} color={color} />
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
