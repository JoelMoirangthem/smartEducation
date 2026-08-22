import { useState, useEffect } from "react";
import axios from "axios";
import { getSocket } from "../services/socket.service";
import { toast } from "react-toastify";
import { User, Mail, FileText, Edit2, Save, X, Camera, Loader2 } from "lucide-react";
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
            toast.success("Profile updated!");
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
            toast.success("Avatar updated!");
        } catch (e) { toast.error(e.response?.data?.message || "Upload failed"); }
        setUploading(false);
    };

    if (loading) return (
        <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--c-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Loading profile…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const accent = roleColors[user.role] || '#6366f1';
    const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=random&size=200&bold=true`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 700, margin: '0 auto', paddingBottom: 40 }}>
            {/* Header */}
            <div style={{
                borderRadius: 16, overflow: 'hidden',
                background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
            }}>
                {/* Banner */}
                <div style={{ height: 80, background: accent + '30' }} />

                <div style={{ padding: '0 24px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 20, marginTop: -32 }}>
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                            width: 100, height: 100, borderRadius: 20, overflow: 'hidden',
                            border: '4px solid var(--c-card-bg)',
                            background: 'var(--c-surface)',
                        }}>
                            <img src={avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {uploading && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Loader2 size={20} color="white" style={{ animation: 'spin 0.8s linear infinite' }} />
                                </div>
                            )}
                        </div>
                        <label style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 32, height: 32, borderRadius: 10, cursor: 'pointer',
                            background: 'var(--c-text)', color: 'var(--c-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '3px solid var(--c-card-bg)',
                        }}>
                            <Camera size={14} />
                            <input type="file" accept="image/*" onChange={handleAvatar} style={{ display: 'none' }} />
                        </label>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 200, paddingBottom: 4 }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>{user.name}</h1>
                        <p style={{ fontSize: '0.85rem', color: 'var(--c-muted)', margin: '4px 0 0' }}>{user.email}</p>
                        <span style={{
                            display: 'inline-block', marginTop: 6, padding: '2px 10px', borderRadius: 6,
                            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                            background: accent + '15', color: accent,
                        }}>{user.role}</span>
                    </div>

                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} style={{
                            padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: accent, color: 'white', fontWeight: 600, fontSize: '0.82rem',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <Edit2 size={14} /> Edit Profile
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {!isEditing ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                    <Field icon={Mail} label="Email" value={user.email} />
                    <Field icon={FileText} label="Bio" value={user.bio || 'No bio set'} />
                    <Field icon={User} label="Role" value={user.role?.charAt(0).toUpperCase() + user.role?.slice(1)} />
                </div>
            ) : (
                <div style={{
                    padding: '24px', borderRadius: 16,
                    background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Edit Profile</h3>
                        <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)', padding: 4 }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
                            <input type="text" value={edit.name} onChange={e => setEdit(p => ({ ...p, name: e.target.value }))}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--c-input-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bio</label>
                            <textarea rows={4} value={edit.bio} onChange={e => setEdit(p => ({ ...p, bio: e.target.value }))}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--c-input-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
                                placeholder="Tell us about yourself…"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                            <button onClick={handleSave} disabled={saving} style={{
                                flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                background: accent, color: 'white', fontWeight: 600, fontSize: '0.85rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}>
                                {saving ? 'Saving…' : <><Save size={16} /> Save Changes</>}
                            </button>
                            <button onClick={() => setIsEditing(false)} style={{
                                padding: '10px 20px', borderRadius: 10, border: '1px solid var(--c-border)',
                                background: 'var(--c-surface)', color: 'var(--c-text)',
                                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                            }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const Field = ({ icon: Icon, label, value }) => (
    <div style={{
        padding: '16px', borderRadius: 12,
        background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon size={14} color="var(--c-muted)" />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--c-text)', fontWeight: 500, margin: 0 }}>{value}</p>
    </div>
);
