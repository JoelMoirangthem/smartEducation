import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { getSocket } from "../services/socket.service";
import { toast } from "react-toastify";
import {
    User, Mail, FileText, Edit2, Save, X, Camera,
    ShieldCheck, GraduationCap, Presentation, Loader2
} from "lucide-react";

const API = "http://localhost:5000/api/v1";

const roleConfig = {
    admin: { color: '#f43f5e', Icon: ShieldCheck, label: 'ADMINISTRATOR' },
    teacher: { color: '#06b6d4', Icon: Presentation, label: 'EDUCATOR' },
    student: { color: '#6366f1', Icon: GraduationCap, label: 'SCHOLAR' },
};

/* ─── field display ───────────────────────────────────────────── */
const Field = ({ icon: Icon, label, value, color }) => (
    <div style={{
        padding: '28px',
        borderRadius: 24,
        background: 'var(--c-card-bg)',
        border: '1px solid var(--c-border)',
        backdropFilter: 'blur(20px)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'relative',
        overflow: 'hidden'
    }}
        className="profile-field-hover"
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
                width: 40, height: 40, borderRadius: 14,
                background: color + '15',
                border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 16px ${color}15`
            }}>
                <Icon size={20} color={color} />
            </div>
            <span style={{
                fontSize: '0.75rem', fontWeight: 800,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: 'var(--c-muted)'
            }}>{label}</span>
        </div>
        <p style={{
            fontSize: '1.1rem',
            color: 'var(--c-text)',
            fontWeight: 700,
            lineHeight: 1.5,
            wordBreak: 'break-word',
            margin: 0,
            zIndex: 1
        }}>{value || <span style={{ color: 'var(--c-muted)', fontStyle: 'italic', fontWeight: 500 }}>Not synchronized</span>}</p>

        {/* Subtle accent glow */}
        <div style={{
            position: 'absolute', bottom: -20, right: -20,
            width: 80, height: 80, borderRadius: '50%',
            background: color, filter: 'blur(50px)', opacity: 0.05
        }} />
    </div>
);

/* ─── edit input ────────────────────────────────────────────── */
const EditInput = ({ label, children }) => (
    <div style={{ marginBottom: 24 }}>
        <label style={{
            display: 'block', fontSize: '0.8rem', fontWeight: 800,
            color: 'var(--c-muted)', marginBottom: 10,
            letterSpacing: '0.1em', textTransform: 'uppercase'
        }}>{label}</label>
        {children}
    </div>
);

export default function Profile() {
    const [user, setUser] = useState({ name: '', email: '', bio: '', role: '', avatar: '' });
    const [edit, setEdit] = useState({ name: '', bio: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchProfile();
        const socket = getSocket();
        if (socket) {
            const h = (data) => {
                const token = localStorage.getItem("token");
                if (!token) return;
                try {
                    const decoded = jwtDecode(token);
                    if (data.userId === decoded.id) {
                        setUser(p => ({ ...p, ...data.user }));
                        setEdit(p => ({ ...p, name: data.user.name, bio: data.user.bio }));
                    }
                } catch { }
            };
            socket.on("PROFILE_UPDATED", h);
            return () => socket.off("PROFILE_UPDATED", h);
        }
    }, []);

    const fetchProfile = async () => {
        try {
            const tk = localStorage.getItem("token");
            const res = await axios.get(`${API}/user/profile`, { headers: { Authorization: `Bearer ${tk}` } });
            setUser(res.data);
            setEdit({ name: res.data.name, bio: res.data.bio || '' });
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const tk = localStorage.getItem("token");
            const res = await axios.put(`${API}/user/profile`, edit, { headers: { Authorization: `Bearer ${tk}` } });
            setUser(res.data.user);
            setIsEditing(false);
            toast.success("Identity profile updated!");
        } catch (e) { toast.error(e.response?.data?.message || "Sync failed"); }
        setSaving(false);
    };

    const handleAvatar = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append("avatar", file);
        try {
            const tk = localStorage.getItem("token");
            const res = await axios.post(`${API}/user/profile/avatar`, fd, {
                headers: { Authorization: `Bearer ${tk}`, "Content-Type": "multipart/form-data" }
            });
            setUser(p => ({ ...p, avatar: res.data.user.avatar }));
            toast.success("Identity visual updated!");
        } catch (e) { toast.error(e.response?.data?.message || "Ingestion failed"); }
        setUploading(false);
    };

    if (loading) return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, color: 'var(--c-muted)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid var(--c-border)', borderTopColor: 'var(--c-primary)', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.05em' }}>AUTHENTICATING IDENTITY…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const cfg = roleConfig[user.role] || roleConfig.student;
    const accent = cfg.color;
    const RoleIcon = cfg.Icon;
    const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=random&size=200&bold=true`;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', gap: 32,
            maxWidth: 1100, margin: '12px auto',
            paddingBottom: 80,
            animation: 'fadeUp 0.8s cubic-bezier(0.2, 1, 0.3, 1)'
        }}>

            {/* ── PROFILE HEADER ── */}
            <div style={{
                borderRadius: 32, overflow: 'hidden',
                background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(30px)',
                position: 'relative'
            }}>
                {/* Banner with sophisticated gradient */}
                <div style={{
                    height: 200,
                    background: `linear-gradient(145deg, ${accent}, ${accent}99, transparent)`,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute', top: -100, right: -50,
                        width: 400, height: 400, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)', filter: 'blur(80px)'
                    }} />
                    <div style={{
                        position: 'absolute', bottom: -50, left: '5%',
                        width: 250, height: 250, borderRadius: '50%',
                        background: accent + '30', filter: 'blur(50px)'
                    }} />
                </div>

                {/* Main Identity Area */}
                <div style={{ padding: '0 48px 48px', position: 'relative' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 36, marginTop: -80 }}>
                        {/* Avatar Integration */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{
                                width: 160, height: 160, borderRadius: 40, overflow: 'hidden',
                                border: `8px solid var(--c-card-bg)`,
                                boxShadow: `0 20px 50px rgba(0,0,0,0.3), 0 0 0 1px var(--c-border)`,
                                background: 'var(--c-surface)',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}>
                                <img src={avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                {uploading && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid transparent', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
                                    </div>
                                )}
                            </div>
                            <label style={{
                                position: 'absolute', bottom: -4, right: -4,
                                width: 48, height: 48, borderRadius: 16, cursor: 'pointer',
                                background: 'var(--c-text)', color: 'var(--c-bg)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '4px solid var(--c-card-bg)',
                                boxShadow: `0 10px 20px rgba(0,0,0,0.2)`,
                                transition: 'all 0.3s cubic-bezier(0.2, 1, 0.3, 1)',
                            }}
                                className="avatar-upload-btn"
                            >
                                <Camera size={20} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} style={{ display: 'none' }} />
                            </label>
                        </div>

                        {/* Identity Details */}
                        <div style={{ flex: 1, minWidth: 300, paddingBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <span style={{
                                    padding: '6px 16px', borderRadius: 14, fontSize: '0.7rem', fontWeight: 800,
                                    letterSpacing: '0.15em', textTransform: 'uppercase',
                                    background: accent + '15', border: `1px solid ${accent}40`, color: accent,
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    backdropFilter: 'blur(10px)'
                                }}>
                                    <RoleIcon size={14} /> {cfg.label}
                                </span>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-muted)', opacity: 0.5 }} />
                                <span style={{ fontSize: '0.85rem', color: 'var(--c-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ID: {user._id?.slice(-8).toUpperCase()}</span>
                            </div>
                            <h1 style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 'clamp(2.2rem, 6vw, 3rem)',
                                fontWeight: 900,
                                color: 'var(--c-text)',
                                lineHeight: 1,
                                letterSpacing: '-0.03em',
                                margin: 0,
                                textShadow: '0 10px 20px rgba(0,0,0,0.1)'
                            }}>{user.name}</h1>
                            <p style={{
                                fontSize: '1.1rem',
                                color: 'var(--c-muted)',
                                marginTop: 10,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10
                            }}>
                                <Mail size={18} style={{ opacity: 0.6 }} /> {user.email}
                            </p>
                        </div>

                        {/* Navigation Actions */}
                        {!isEditing && (
                            <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', paddingBottom: 12 }}>
                                <button onClick={() => setIsEditing(true)} style={{
                                    padding: '16px 36px', borderRadius: 20, border: 'none', cursor: 'pointer',
                                    background: `linear-gradient(135deg,${accent},${accent}dd)`,
                                    color: 'white', fontWeight: 800, fontSize: '0.95rem',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    boxShadow: `0 15px 35px ${accent}40`, transition: 'all 0.4s cubic-bezier(0.2, 1, 0.3, 1)',
                                    letterSpacing: '0.02em'
                                }}
                                    className="profile-primary-btn"
                                >
                                    <Edit2 size={18} /> MODIFY IDENTITY
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── PROFILE CONTENT MATRIX ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 24
            }}>
                {!isEditing ? (
                    <>
                        <Field icon={Mail} label="AUTHENTICATED EMAIL" value={user.email} color={accent} />
                        <Field icon={FileText} label="PROFILE SYNOPSIS" value={user.bio} color={accent} />
                        <Field icon={ShieldCheck} label="SECURITY CLEARANCE" value={cfg.label} color={accent} />

                        <div style={{
                            gridColumn: '1 / -1',
                            padding: '32px',
                            background: `linear-gradient(135deg, ${accent}10, transparent)`,
                            borderRadius: 28,
                            border: `1px dashed ${accent}30`,
                            textAlign: 'center',
                            marginTop: 12
                        }}>
                            <p style={{ color: 'var(--c-muted)', fontSize: '0.95rem', fontWeight: 600, margin: 0, letterSpacing: '0.02em' }}>
                                Account verified under the <strong style={{ color: accent, fontWeight: 800 }}>{cfg.label}</strong> protocol.
                                Last synchronization: {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </>
                ) : (
                    <div style={{
                        gridColumn: '1 / -1',
                        padding: '48px',
                        borderRadius: 32,
                        background: 'var(--c-card-bg)',
                        border: `1px solid ${accent}40`,
                        boxShadow: '0 40px 80px rgba(0,0,0,0.2)',
                        backdropFilter: 'blur(30px)',
                        animation: 'fadeUp 0.5s cubic-bezier(0.2, 1, 0.3, 1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
                            <div>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, color: 'var(--c-text)', margin: 0, letterSpacing: '-0.02em' }}>
                                    Modify Identity Profile
                                </h2>
                                <p style={{ color: 'var(--c-muted)', fontSize: '1rem', marginTop: 8, fontWeight: 500 }}>Refine your personal manifesto and display credentials.</p>
                            </div>
                            <button onClick={() => setIsEditing(false)} style={{
                                width: 48, height: 48, borderRadius: 16, border: '1px solid var(--c-border)',
                                background: 'var(--c-surface)', cursor: 'pointer', color: 'var(--c-text)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.2, 1, 0.3, 1)'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--c-surface)'}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <EditInput label="IDENTITY NAME">
                                <input type="text" value={edit.name} onChange={e => setEdit(p => ({ ...p, name: e.target.value }))}
                                    style={{
                                        width: '100%', padding: '18px 24px', borderRadius: 18,
                                        background: 'var(--c-input-bg)', border: '1px solid var(--c-border)',
                                        color: 'var(--c-text)', fontSize: '1.1rem', fontWeight: 600, outline: 'none',
                                        fontFamily: 'inherit', transition: 'all 0.3s cubic-bezier(0.2, 1, 0.3, 1)'
                                    }}
                                    placeholder="Your designated nomenclature"
                                    onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 4px ${accent}15`; }}
                                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
                                />
                            </EditInput>

                            <EditInput label="PERSONAL MANIFESTO">
                                <textarea rows={6} value={edit.bio} onChange={e => setEdit(p => ({ ...p, bio: e.target.value }))}
                                    style={{
                                        width: '100%', padding: '18px 24px', borderRadius: 18,
                                        background: 'var(--c-input-bg)', border: '1px solid var(--c-border)',
                                        color: 'var(--c-text)', fontSize: '1.1rem', fontWeight: 500, outline: 'none',
                                        fontFamily: 'inherit', transition: 'all 0.3s cubic-bezier(0.2, 1, 0.3, 1)',
                                        resize: 'none', lineHeight: 1.6
                                    }}
                                    placeholder="Communicate your professional or academic narrative…"
                                    onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 4px ${accent}15`; }}
                                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
                                />
                            </EditInput>

                            <div style={{ display: 'flex', gap: 20, marginTop: 32 }}>
                                <button onClick={handleSave} disabled={saving} style={{
                                    flex: 1, padding: '18px', borderRadius: 20, border: 'none',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    background: saving ? 'var(--c-muted)' : `linear-gradient(135deg,${accent},${accent}dd)`,
                                    color: 'white', fontWeight: 800, fontSize: '1.1rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                                    boxShadow: saving ? 'none' : `0 15px 35px ${accent}40`,
                                    transition: 'all 0.4s cubic-bezier(0.2, 1, 0.3, 1)',
                                    letterSpacing: '0.02em'
                                }}>
                                    {saving ? <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'white', animation: 'spin 0.6s linear infinite' }} /> : <Save size={20} />}
                                    {saving ? 'SYNCHRONIZING…' : 'UPDATE IDENTITY'}
                                </button>
                                <button onClick={() => setIsEditing(false)} style={{
                                    padding: '18px 40px', borderRadius: 20, border: '1px solid var(--c-border)',
                                    background: 'var(--c-surface)', color: 'var(--c-text)',
                                    fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.2, 1, 0.3, 1)',
                                    letterSpacing: '0.02em'
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--c-surface)'}
                                >
                                    ABORT
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .profile-field-hover:hover { transform: translateY(-8px); border-color: ${accent}60; box-shadow: 0 20px 40px ${accent}15; }
                .avatar-upload-btn:hover { transform: scale(1.1) rotate(4deg); background: ${accent}; color: white; }
                .profile-primary-btn:hover { transform: translateY(-4px); box-shadow: 0 20px 45px ${accent}60; }
                @keyframes fadeUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
                @keyframes spin { to { transform: rotate(360deg); } }
                .hidden { display: none; }
            `}</style>
        </div>
    );
}
