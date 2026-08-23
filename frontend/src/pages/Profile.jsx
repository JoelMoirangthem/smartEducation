import { useState, useEffect } from "react";
import { getSocket } from "../services/socket.service";
import { toast } from "react-toastify";
import { User, Mail, FileText, Edit2, Save, X, Camera, Loader2, Shield, Sparkles } from "lucide-react";
import api from '../services/api';
const API = api.defaults.baseURL;

const roleColors = { admin: '#f43f5e', teacher: '#06b6d4', student: '#6366f1' };

export default function Profile() {
    const [user, setUser] = useState({ name: '', email: '', bio: '', role: '', avatar: '' });
    const [edit, setEdit] = useState({ name: '', bio: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        api.get('/user/profile')
            .then(res => { setUser(res.data); setEdit({ name: res.data.name, bio: res.data.bio || '' }); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.put('/user/profile', edit);
            setUser(res.data.user);
            setIsEditing(false);
            toast.success("Profile updated — spacious sync ✓");
        } catch (e) { toast.error(e.response?.data?.message || "Update failed"); }
        setSaving(false);
    };

    const handleAvatar = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append("avatar", file);
        try {
            const res = await api.post('/user/profile/avatar', fd, { headers: { "Content-Type": "multipart/form-data" } });
            setUser(p => ({ ...p, avatar: res.data.user.avatar }));
            toast.success("Avatar refreshed ✨");
        } catch (e) { toast.error(e.response?.data?.message || "Upload failed"); }
        setUploading(false);
    };

    if (loading) return (
        <div style={{ minHeight: '52vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--c-muted)' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontWeight: 600 }}>Loading profile…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const accent = roleColors[user.role] || '#6366f1';
    const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=6366f1&color=fff&size=300&bold=true`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 860, margin: '0 auto', paddingBottom: 24 }}>
            {/* Header card — spacious */}
            <div style={{
                borderRadius: 'var(--r-2xl)', overflow: 'hidden',
                background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
                backdropFilter: 'blur(18px)', boxShadow: 'var(--shadow-sm)',
            }}>
                {/* Banner */}
                <div style={{ height: 132, background: `linear-gradient(135deg, ${accent}22, ${accent}0e 60%, transparent)`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: `linear-gradient(var(--c-border) 1px, transparent 1px), linear-gradient(90deg, var(--c-border) 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />
                    <div style={{ position: 'absolute', top: -30, right: -20, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(closest-side, ${accent}22, transparent)` }} />
                    <div style={{ position: 'absolute', left: 32, bottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.9)', color: accent, fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', backdropFilter: 'blur(10px)' }}>
                            <Shield size={12} /> {user.role} • Verified
                        </span>
                    </div>
                </div>

                <div style={{ padding: '0 28px 28px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 24, marginTop: -44, position: 'relative' }}>
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                            width: 118, height: 118, borderRadius: 22, overflow: 'hidden',
                            border: '4px solid var(--c-card-bg)',
                            background: 'var(--c-surface)',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
                        }}>
                            <img src={avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {uploading && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.56)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 22 }}>
                                    <Loader2 size={22} color="white" style={{ animation: 'spin 0.8s linear infinite' }} />
                                </div>
                            )}
                        </div>
                        <label style={{
                            position: 'absolute', bottom: -4, right: -4,
                            width: 38, height: 38, borderRadius: 12, cursor: 'pointer',
                            background: 'var(--c-text)', color: 'var(--c-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '3px solid var(--c-card-bg)', boxShadow: '0 6px 16px rgba(0,0,0,0.14)',
                            transition: 'transform 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Camera size={16} />
                            <input type="file" accept="image/*" onChange={handleAvatar} style={{ display: 'none' }} />
                        </label>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 240, paddingBottom: 6 }}>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 850, color: 'var(--c-text)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{user.name}</h1>
                        <p style={{ fontSize: '0.92rem', color: 'var(--c-muted)', margin: '6px 0 0', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Mail size={14} />{user.email}</span>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-border)', display: 'inline-block' }} />
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: accent + '14', color: accent, fontWeight: 750, fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', border: `1px solid ${accent}20` }}>{user.role}</span>
                        </p>
                        {user.bio && <p style={{ fontSize: '0.9rem', color: 'var(--c-text)', opacity: 0.78, marginTop: 10, lineHeight: 1.6, maxWidth: 520 }}>{user.bio}</p>}
                    </div>

                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} style={{
                            padding: '13px 22px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: accent, color: 'white', fontWeight: 800, fontSize: '0.88rem',
                            display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 8px 20px ${accent}28`, transition: 'all 0.18s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(1.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.filter = ''; }}
                        >
                            <Edit2 size={16} /> Edit Profile
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {!isEditing ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                    <Field icon={Mail} label="Email" value={user.email} accent={accent} />
                    <Field icon={FileText} label="Bio" value={user.bio || 'No bio set — add a short intro so classmates recognise you.'} accent={accent} />
                    <Field icon={User} label="Role" value={user.role?.charAt(0).toUpperCase() + user.role?.slice(1)} accent={accent} />
                </div>
            ) : (
                <div style={{
                    padding: '28px', borderRadius: 'var(--r-xl)',
                    background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', backdropFilter: 'blur(18px)', boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}><Sparkles size={16} color={accent} /> Edit Profile</h3>
                        <button onClick={() => setIsEditing(false)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-surface)', border: '1px solid var(--c-border)', cursor: 'pointer', color: 'var(--c-muted)', display: 'grid', placeItems: 'center' }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.09em' }}>Name</label>
                            <input type="text" value={edit.name} onChange={e => setEdit(p => ({ ...p, name: e.target.value }))}
                                style={{ width: '100%', padding: '13px 16px', borderRadius: 12, background: 'var(--c-input-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: '0.94rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.09em' }}>Bio</label>
                            <textarea rows={4} value={edit.bio} onChange={e => setEdit(p => ({ ...p, bio: e.target.value }))}
                                style={{ width: '100%', padding: '13px 16px', borderRadius: 12, background: 'var(--c-input-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: '0.94rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 110, boxSizing: 'border-box' }}
                                placeholder="Tell us about yourself…"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button onClick={handleSave} disabled={saving} style={{
                                flex: 1, padding: '13px', borderRadius: 12, border: 'none',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                background: accent, color: 'white', fontWeight: 800, fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 8px 20px ${accent}22`
                            }}>
                                {saving ? 'Saving…' : <><Save size={16} /> Save Changes</>}
                            </button>
                            <button onClick={() => setIsEditing(false)} style={{
                                padding: '13px 22px', borderRadius: 12, border: '1px solid var(--c-border)',
                                background: 'var(--c-surface)', color: 'var(--c-text)',
                                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                            }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

const Field = ({ icon: Icon, label, value, accent }) => (
    <div style={{
        padding: '20px 20px', borderRadius: 'var(--r-lg)',
        background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', backdropFilter: 'blur(14px)', boxShadow: 'var(--shadow-sm)'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--c-surface)', border: '1px solid var(--c-border)', display: 'grid', placeItems: 'center', color: 'var(--c-muted)' }}>
                <Icon size={14} />
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        </div>
        <p style={{ fontSize: '0.95rem', color: 'var(--c-text)', fontWeight: 600, margin: 0, lineHeight: 1.6 }}>{value}</p>
    </div>
);
