import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";
import { toast } from 'react-toastify';
import {
  CheckSquare, Bell, GraduationCap,
  Send, FileText, ChevronRight, Loader2,
  BookOpen, MessageSquare
} from "lucide-react";
import api from "../services/api";
import { initializeSocket } from "../services/socket.service";

const formatTimeAgo = (date) => {
  const diff = Date.now() - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'var(--c-input-bg)', border: '1px solid var(--c-border)',
  color: 'var(--c-text)', fontSize: '0.9rem', outline: 'none',
  fontFamily: 'inherit',
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postForm, setPostForm] = useState({ title: '', content: '', targetType: 'CLASS', classId: '', subjectId: '', priority: 'medium' });
  const [posting, setPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      setUser(decoded);
      const requests = [api.get('/user/subjects'), api.get('/notices')];
      if (decoded.role === 'teacher' || decoded.role === 'admin') requests.push(api.get('/user/classes'));
      Promise.all(requests)
        .then(([subR, notR, classR]) => {
          setSubjects(subR.data || []);
          setNotices((notR.data.notices || []).slice(0, 5));
          if (classR) {
            const classes = classR.data || [];
            setTeacherClasses(classes);
            if (classes.length === 1) setPostForm(p => ({ ...p, classId: classes[0]._id }));
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));

      const socket = initializeSocket(decoded.id, decoded.classId, decoded.role);
      if (socket) {
        const handleNew = n => setNotices(p => [n, ...p.filter(x => x._id !== n._id)].slice(0, 5));
        socket.on('notice_created', handleNew);
        return () => socket.off('notice_created', handleNew);
      }
    } catch { setLoading(false); }
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    if (postForm.targetType === 'CLASS' && !postForm.classId) { toast.error('Select a class.'); return; }
    setPosting(true);
    try {
      await api.post('/notices/add', postForm);
      toast.success('Notice posted!');
      setPostForm({ title: '', content: '', targetType: 'CLASS', classId: '', subjectId: '', priority: 'medium' });
      setShowForm(false);
      const r = await api.get('/notices');
      setNotices((r.data.notices || []).slice(0, 5));
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to post.'); }
    setPosting(false);
  };

  if (loading) return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--c-muted)' }}>
      <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
      <p>Loading…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const accent = isAdmin ? '#f43f5e' : isTeacher ? '#06b6d4' : '#6366f1';

  const quickLinks = [
    { to: '/attendance', icon: CheckSquare, label: 'Attendance', color: '#34d399', roles: ['teacher', 'student'] },
    { to: '/marks', icon: GraduationCap, label: 'Marks', color: '#fbbf24', roles: ['teacher', 'student'] },
    { to: '/notes', icon: BookOpen, label: 'Notes', color: '#fb923c', roles: ['teacher', 'student'] },
    { to: '/notices', icon: Bell, label: 'Notices', color: '#f43f5e', roles: ['admin', 'teacher', 'student'] },
    { to: '/chat', icon: MessageSquare, label: 'AI Chat', color: '#a78bfa', roles: ['teacher', 'student', 'admin'] },
  ].filter(l => l.roles.includes(user?.role));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Welcome */}
      <div style={{
        padding: '24px', borderRadius: 16,
        background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {user?.role}
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(isAdmin || isTeacher) && (
            <button onClick={() => setShowForm(t => !t)} style={{
              padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: accent, color: 'white', fontWeight: 600, fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {showForm ? 'Cancel' : <><Send size={14} /> New Notice</>}
            </button>
          )}
        </div>
      </div>

      {/* Notice form */}
      {showForm && (
        <div style={{
          padding: '20px', borderRadius: 16,
          background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 16px' }}>Post Notice</h3>
          <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input placeholder="Title" value={postForm.title} onChange={e => setPostForm(p => ({ ...p, title: e.target.value }))} required style={inputStyle} />
            <select value={postForm.targetType} onChange={e => setPostForm(p => ({ ...p, targetType: e.target.value, classId: '', subjectId: '' }))} style={inputStyle}>
              <option value="CLASS">Class</option>
              <option value="SUBJECT">Subject</option>
              {isAdmin && <option value="ALL">All</option>}
            </select>
            {postForm.targetType === 'CLASS' && (
              <select value={postForm.classId} onChange={e => setPostForm(p => ({ ...p, classId: e.target.value }))} style={inputStyle} required>
                <option value="">Select class</option>
                {teacherClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            )}
            <textarea placeholder="Message…" value={postForm.content} onChange={e => setPostForm(p => ({ ...p, content: e.target.value }))} required rows={3} style={{ ...inputStyle, resize: 'none' }} />
            <button type="submit" disabled={posting} style={{
              padding: '10px', borderRadius: 10, border: 'none', cursor: posting ? 'not-allowed' : 'pointer',
              background: accent, color: 'white', fontWeight: 600, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {posting ? 'Posting…' : 'Post Notice'}
            </button>
          </form>
        </div>
      )}

      {/* Quick Links + Notices */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {/* Quick Links */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, color: 'var(--c-text)' }}>Quick Links</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickLinks.map(l => {
              const Icon = l.icon;
              return (
                <Link key={l.to} to={l.to} style={{
                  display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
                  padding: '12px 16px', borderRadius: 12,
                  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                  transition: 'border-color 0.15s ease',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = l.color + '40'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border)'}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: l.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} color={l.color} />
                  </div>
                  <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, color: 'var(--c-text)' }}>{l.label}</span>
                  <ChevronRight size={14} color="var(--c-muted)" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Notices */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>Recent Notices</h3>
            <Link to="/notices" style={{ fontSize: '0.78rem', color: accent, textDecoration: 'none', fontWeight: 600 }}>View all</Link>
          </div>
          {notices.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--c-muted)', padding: '24px 0', textAlign: 'center' }}>No notices yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notices.map(n => (
                <div key={n._id} style={{
                  padding: '14px 16px', borderRadius: 12,
                  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                  borderLeft: `3px solid ${n.priority === 'high' || n.priority === 'urgent' ? '#ef4444' : n.priority === 'medium' ? '#6366f1' : '#22c55e'}`,
                }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--c-text)', margin: '0 0 4px' }}>{n.title}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--c-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--c-muted)', marginTop: 6, opacity: 0.6 }}>{formatTimeAgo(n.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subjects */}
      {!isAdmin && subjects.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, color: 'var(--c-text)' }}>
            {isTeacher ? 'Your Subjects' : 'Enrolled Subjects'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {subjects.slice(0, 6).map(sub => (
              <div key={sub._id} style={{
                padding: '14px', borderRadius: 12,
                background: 'var(--c-surface)', border: '1px solid var(--c-border)',
              }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-text)', margin: '0 0 2px' }}>{sub.name}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--c-muted)', margin: 0 }}>{sub.code}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
