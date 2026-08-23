import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";
import { toast } from 'react-toastify';
import {
  CheckSquare, Bell, GraduationCap,
  Send, ChevronRight, Loader2,
  BookOpen, MessageSquare, Sparkles, Users, Layers, ArrowUpRight
} from "lucide-react";
import api from "../services/api";
import { initializeSocket } from "../services/socket.service";
import useSocketEvent from "../hooks/useSocketEvent";

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
  width: '100%', padding: '13px 16px', borderRadius: 12,
  background: 'var(--c-input-bg)', border: '1px solid var(--c-border)',
  color: 'var(--c-text)', fontSize: '0.92rem', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box'
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
          setNotices((notR.data.notices || []).slice(0, 6));
          if (classR) {
            const classes = classR.data || [];
            setTeacherClasses(classes);
            if (classes.length === 1) setPostForm(p => ({ ...p, classId: classes[0]._id }));
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));

      initializeSocket(decoded.id, decoded.classId, decoded.role);
    } catch { setLoading(false); }
  }, []);

  useSocketEvent('notice_created', n => {
    if (!n?._id) return;
    setNotices(p => [n, ...p.filter(x => x._id !== n._id)].slice(0, 6));
  });
  useSocketEvent('notice_updated', n => {
    if (!n?._id) return;
    setNotices(p => p.some(x => x._id === n._id)
      ? p.map(x => x._id === n._id ? n : x)
      : p);
  });
  useSocketEvent('notice_deleted', d => {
    const id = d?.noticeId || d?._id || d;
    if (!id) return;
    setNotices(p => p.filter(x => x._id !== id));
  });

  const handlePost = async (e) => {
    e.preventDefault();
    if (postForm.targetType === 'CLASS' && !postForm.classId) { toast.error('Select a class.'); return; }
    setPosting(true);
    try {
      const r = await api.post('/notices/add', postForm);
      toast.success('Notice broadcasted ✨');
      setPostForm({ title: '', content: '', targetType: 'CLASS', classId: '', subjectId: '', priority: 'medium' });
      setShowForm(false);
      const created = r.data?.notice;
      if (created?._id) {
        setNotices(p => [created, ...p.filter(x => x._id !== created._id)].slice(0, 6));
      } else {
        const fresh = await api.get('/notices');
        setNotices((fresh.data.notices || []).slice(0, 6));
      }
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to post.'); }
    setPosting(false);
  };

  if (loading) return (
    <div style={{ minHeight: '52vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--c-muted)' }}>
      <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ fontWeight: 600 }}>Loading workspace…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const accent = isAdmin ? '#f43f5e' : isTeacher ? '#06b6d4' : '#6366f1';

  const quickLinks = [
    { to: '/attendance', icon: CheckSquare, label: 'Attendance', desc: 'Live sessions & history', color: '#10b981', roles: ['teacher', 'student'] },
    { to: '/marks', icon: GraduationCap, label: 'Marks', desc: 'Scores & analytics', color: '#f59e0b', roles: ['teacher', 'student'] },
    { to: '/notes', icon: BookOpen, label: 'Notes', desc: 'Resources & materials', color: '#fb923c', roles: ['teacher', 'student'] },
    { to: '/notices', icon: Bell, label: 'Notices', desc: 'Bulletins & alerts', color: '#ef4444', roles: ['admin', 'teacher', 'student'] },
    { to: '/chat', icon: MessageSquare, label: 'AI Chat', desc: 'Tutor & Agent', color: '#8b5cf6', roles: ['teacher', 'student', 'admin'] },
  ].filter(l => l.roles.includes(user?.role));

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* ——— Hero — spacious ——— */}
      <div style={{
        padding: '36px 36px 32px', borderRadius: 'var(--r-2xl)',
        background: `linear-gradient(135deg, ${accent}14 0%, ${accent}08 32%, var(--c-card-bg) 68%), var(--c-card-bg)`,
        border: '1px solid var(--c-border)',
        backdropFilter: 'blur(18px) saturate(1.12)', WebkitBackdropFilter: 'blur(18px) saturate(1.12)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 28,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -40, width: 360, height: 360, borderRadius: '50%', background: `radial-gradient(closest-side, ${accent}18, transparent)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.035, pointerEvents: 'none', backgroundImage: `linear-gradient(var(--c-border) 1px, transparent 1px), linear-gradient(90deg, var(--c-border) 1px, transparent 1px)`, backgroundSize: '36px 36px' }} />

        <div style={{ position: 'relative', minWidth: 280, flex: '1 1 520px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: `${accent}12`, border: `1px solid ${accent}20`, marginBottom: 14 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}80` }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent }}>{user?.role} workspace</span>
            <span style={{ width: 1, height: 12, background: 'var(--c-border)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--c-muted)' }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)', fontWeight: 850, color: 'var(--c-text)', margin: 0, letterSpacing: '-0.04em', lineHeight: 1.06 }}>
            Welcome back,<br />
            <span style={{ background: `linear-gradient(135deg, ${accent}, #a78bfa)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{firstName}!</span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--c-muted)', marginTop: 12, lineHeight: 1.6, maxWidth: 560, fontWeight: 500 }}>
            {isAdmin ? 'Oversee your institution — users, classes and live academic operations from one spacious command center.' :
              isTeacher ? 'Your teaching workspace is ready — launch attendance, share notices and guide learners with AI.' :
                'Your learning hub is ready — track attendance, explore notes and stay on top of every notice.'}
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}14`, border: `1px solid ${accent}20`, display: 'grid', placeItems: 'center', color: accent }}><Layers size={16} /></span>
              <div>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--c-text)', margin: 0, lineHeight: 1 }}>{subjects.length} Subjects</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--c-muted)', margin: 0 }}>enrolled / assigned</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: '#ef444415', border: '1px solid #ef444422', display: 'grid', placeItems: 'center', color: '#ef4444' }}><Bell size={16} /></span>
              <div>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--c-text)', margin: 0, lineHeight: 1 }}>{notices.length} Notices</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--c-muted)', margin: 0 }}>live & recent</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 280, flex: '0 1 360px', position: 'relative' }}>
          {(isAdmin || isTeacher) && (
            <button onClick={() => setShowForm(t => !t)} style={{
              padding: '16px 22px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: accent, color: 'white', fontWeight: 800, fontSize: '0.92rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: `0 10px 28px ${accent}28, 0 2px 8px rgba(0,0,0,0.12)`,
              transition: 'all 0.18s', letterSpacing: '-0.01em',
              width: '100%'
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(1.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.filter = ''; }}
            >
              {showForm ? 'Close composer' : <><Send size={16} /> Broadcast Notice</>}
            </button>
          )}
          <Link to="/chat" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '14px 22px', borderRadius: 14, textDecoration: 'none',
            background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text)',
            fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.18s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-surface-hover)'; e.currentTarget.style.borderColor = 'var(--c-border-strong)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--c-surface)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}
          >
            <Sparkles size={16} color={accent} /> Open AI Workspace <ArrowUpRight size={14} />
          </Link>
          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--c-muted)', margin: 0, opacity: 0.7 }}>Full-screen · Glass · Spacious</p>
        </div>
      </div>

      {/* Notice composer — expanded spacious */}
      {showForm && (
        <div style={{
          padding: '28px 28px 24px', borderRadius: 'var(--r-xl)',
          background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
          backdropFilter: 'blur(18px)', boxShadow: 'var(--shadow-sm)', animation: 'fadeUp 0.3s var(--ease-out)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Compose Notice</h3>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, background: `${accent}12`, border: `1px solid ${accent}20`, padding: '4px 10px', borderRadius: 999 }}>Live broadcast</span>
          </div>
          <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input placeholder="Headline — what should everyone see first?" value={postForm.title} onChange={e => setPostForm(p => ({ ...p, title: e.target.value }))} required style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <select value={postForm.targetType} onChange={e => setPostForm(p => ({ ...p, targetType: e.target.value, classId: '', subjectId: '' }))} style={inputStyle}>
                <option value="CLASS">Target: Class</option>
                <option value="SUBJECT">Target: Subject</option>
                {isAdmin && <option value="ALL">Target: Everyone</option>}
              </select>
              {postForm.targetType === 'CLASS' && (
                <select value={postForm.classId} onChange={e => setPostForm(p => ({ ...p, classId: e.target.value }))} style={inputStyle} required>
                  <option value="">Select class</option>
                  {teacherClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              )}
              <select value={postForm.priority} onChange={e => setPostForm(p => ({ ...p, priority: e.target.value }))} style={inputStyle}>
                <option value="low">Priority: General</option>
                <option value="medium">Priority: Standard</option>
                <option value="high">Priority: High</option>
                <option value="urgent">Priority: Critical</option>
              </select>
            </div>
            <textarea placeholder="Write the full message… keep it clear and actionable." value={postForm.content} onChange={e => setPostForm(p => ({ ...p, content: e.target.value }))} required rows={4} style={{ ...inputStyle, resize: 'vertical', minHeight: 110 }} />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-text)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={posting} style={{
                padding: '12px 22px', borderRadius: 12, border: 'none', cursor: posting ? 'not-allowed' : 'pointer',
                background: accent, color: 'white', fontWeight: 800, fontSize: '0.9rem',
                display: 'inline-flex', alignItems: 'center', gap: 8, opacity: posting ? 0.7 : 1
              }}>
                {posting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />} {posting ? 'Broadcasting…' : 'Broadcast Now'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bento grid — Quick Links + Notices */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24, alignItems: 'start' }}>
        {/* Quick Links — 5 cols on xl, full on mobile */}
        <div style={{ gridColumn: 'span 5', minWidth: 0 }} className="dash-links">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--c-text)', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: 10, background: 'var(--c-surface)', border: '1px solid var(--c-border)', display: 'grid', placeItems: 'center' }}><Layers size={14} /></span>
              Quick Actions
            </h3>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--c-muted)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', padding: '4px 10px', borderRadius: 999 }}>{quickLinks.length} shortcuts</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {quickLinks.map(l => {
              const Icon = l.icon;
              return (
                <Link key={l.to} to={l.to} style={{
                  display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none',
                  padding: '16px 18px', borderRadius: 16,
                  background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
                  backdropFilter: 'blur(14px)', boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.22s var(--ease-out)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = l.color + '32'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: l.color + '14',
                    border: `1px solid ${l.color}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Icon size={20} color={l.color} strokeWidth={1.9} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: 750, color: 'var(--c-text)', margin: 0, letterSpacing: '-0.015em' }}>{l.label}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--c-muted)', margin: '2px 0 0', fontWeight: 500 }}>{l.desc}</p>
                  </div>
                  <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--c-surface)', border: '1px solid var(--c-border)', display: 'grid', placeItems: 'center', color: 'var(--c-muted)', flexShrink: 0 }}>
                    <ChevronRight size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Notices — 7 cols */}
        <div style={{ gridColumn: 'span 7', minWidth: 0 }} className="dash-notices">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--c-text)', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: 10, background: 'var(--c-surface)', border: '1px solid var(--c-border)', display: 'grid', placeItems: 'center' }}><Bell size={14} /></span>
              Recent Notices
            </h3>
            <Link to="/notices" style={{ fontSize: '0.8rem', color: accent, textDecoration: 'none', fontWeight: 750, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: `${accent}10`, border: `1px solid ${accent}18` }}>View all <ChevronRight size={14} /></Link>
          </div>
          {notices.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', borderRadius: 20, background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>
              <Bell size={28} style={{ opacity: 0.35, marginBottom: 12 }} />
              <p style={{ fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>All quiet</p>
              <p style={{ fontSize: '0.85rem', marginTop: 6 }}>New bulletins will appear here — spacious and live.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {notices.map(n => (
                <div key={n._id} style={{
                  padding: '18px 20px', borderRadius: 16,
                  background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
                  borderLeft: `4px solid ${n.priority === 'high' || n.priority === 'urgent' ? '#ef4444' : n.priority === 'medium' ? '#6366f1' : '#22c55e'}`,
                  boxShadow: 'var(--shadow-sm)', transition: 'all 0.18s', backdropFilter: 'blur(12px)'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <p style={{ fontSize: '0.96rem', fontWeight: 750, color: 'var(--c-text)', margin: 0, letterSpacing: '-0.015em', lineHeight: 1.35 }}>{n.title}</p>
                    <span style={{ fontSize: '0.68rem', fontWeight: 750, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 8px', borderRadius: 999, background: n.priority === 'high' || n.priority === 'urgent' ? '#ef444414' : n.priority === 'medium' ? '#6366f114' : '#22c55e14', color: n.priority === 'high' || n.priority === 'urgent' ? '#ef4444' : n.priority === 'medium' ? '#6366f1' : '#22c55e', border: `1px solid ${n.priority === 'high' ? '#ef444420' : n.priority === 'medium' ? '#6366f120' : '#22c55e20'}` }}>{n.priority || 'general'}</span>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--c-muted)', margin: '8px 0 0', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.content}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 8, background: 'var(--c-surface)', border: '1px solid var(--c-border)', display: 'grid', placeItems: 'center', color: 'var(--c-muted)' }}><Users size={10} /></span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--c-muted)', fontWeight: 600 }}>{n.createdBy?.name || 'System'}</span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--c-border)' }} />
                    <span style={{ fontSize: '0.74rem', color: 'var(--c-muted)', opacity: 0.8 }}>{formatTimeAgo(n.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subjects — full-width spacious */}
      {!isAdmin && subjects.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-text)', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: 10, background: 'var(--c-surface)', border: '1px solid var(--c-border)', display: 'grid', placeItems: 'center' }}><BookOpen size={14} /></span>
              {isTeacher ? 'Your Subjects' : 'Enrolled Subjects'}
            </h3>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--c-muted)', background: 'var(--c-surface)', border: '1px solid var(--c-border)', padding: '6px 12px', borderRadius: 999 }}>{subjects.length} courses</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {subjects.slice(0, 8).map((sub, i) => (
              <div key={sub._id} style={{
                padding: '20px 20px 18px', borderRadius: 18,
                background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
                backdropFilter: 'blur(14px)', boxShadow: 'var(--shadow-sm)',
                position: 'relative', overflow: 'hidden', transition: 'all 0.22s',
                animation: `fadeUp 0.4s var(--ease-out) ${i * 0.04}s both`
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = accent + '22'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}
              >
                <div style={{ position: 'absolute', top: -18, right: -18, width: 84, height: 84, borderRadius: '50%', background: `${accent}08`, border: `1px solid ${accent}10` }} />
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}10`, border: `1px solid ${accent}18`, display: 'grid', placeItems: 'center', color: accent, marginBottom: 14 }}>
                  <BookOpen size={18} />
                </div>
                <p style={{ fontSize: '0.96rem', fontWeight: 750, color: 'var(--c-text)', margin: 0, letterSpacing: '-0.015em', lineHeight: 1.3 }}>{sub.name}</p>
                <p style={{ fontSize: '0.72rem', fontWeight: 750, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, marginTop: 6, background: `${accent}10`, border: `1px solid ${accent}16`, display: 'inline-flex', padding: '4px 8px', borderRadius: 999 }}>{sub.code}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform: translateY(0);} }
        @keyframes spin{to{transform:rotate(360deg)}}
        @media (max-width: 1100px) {
          .dash-links, .dash-notices { grid-column: span 12 !important; }
        }
      `}</style>
    </div>
  );
}
