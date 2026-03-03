import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";
import { toast } from 'react-toastify';
import {
  LayoutDashboard, BookOpen, CheckSquare, Bell, GraduationCap,
  Sparkles, Send, FileText, ChevronRight, Loader2,
  TrendingUp, Users, Award, Clock, Megaphone, X
} from "lucide-react";
import axios from "axios";
import { initializeSocket } from "../services/socket.service";

const API = "http://localhost:5000/api";

/* ─── tiny helpers ──────────────────────────────────────────── */
const priorityStyle = {
  urgent: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.25)' },
  high: { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', border: 'rgba(249, 115, 22, 0.25)' },
  medium: { bg: 'rgba(99, 102, 241, 0.12)', text: '#6366f1', border: 'rgba(99, 102, 241, 0.25)' },
  low: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.25)' },
};

const Pill = ({ label, style }) => (
  <span style={{
    padding: '3px 12px', borderRadius: 10, fontSize: '0.6rem',
    fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
    border: `1px solid ${style.border}`, background: style.bg, color: style.text,
    display: 'inline-flex', alignItems: 'center'
  }}>{label}</span>
);

const formatTimeAgo = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

/* ─── stat card ─────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div style={{
    background: 'var(--c-surface)',
    border: '1px solid var(--c-border)',
    borderRadius: 24,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'default',
    boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
  }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-6px)';
      e.currentTarget.style.borderColor = color + '50';
      e.currentTarget.style.boxShadow = `0 20px 40px ${color}15`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = 'var(--c-border)';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.02)';
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 16,
        background: color + '12', border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color={color} />
      </div>
      {sub && <span style={{ fontSize: '0.68rem', color: 'var(--c-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{sub}</span>}
    </div>
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--c-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--c-text)', lineHeight: 1, fontFamily: 'var(--font-display)' }}>{value}</p>
    </div>
  </div>
);

/* ─── Quick link card ───────────────────────────────────────── */
const QuickCard = ({ to, icon: Icon, label, desc, color }) => (
  <Link to={to} style={{
    display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none',
    padding: '18px 20px', borderRadius: 20,
    background: 'var(--c-surface)',
    border: '1px solid var(--c-border)',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.01)'
  }}
    onMouseEnter={e => {
      e.currentTarget.style.background = 'var(--c-surface-hover)';
      e.currentTarget.style.borderColor = color + '40';
      e.currentTarget.style.transform = 'translateX(6px)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = 'var(--c-surface)';
      e.currentTarget.style.borderColor = 'var(--c-border)';
      e.currentTarget.style.transform = '';
    }}
  >
    <div style={{
      width: 50, height: 50, borderRadius: 16, flexShrink: 0,
      background: color + '15', border: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={24} color={color} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-text)', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: '0.8rem', color: 'var(--c-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{desc}</p>
    </div>
    <div style={{
      width: 32, height: 32, borderRadius: '50%', background: 'var(--c-nav-inactive-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <ChevronRight size={16} color="var(--c-muted)" />
    </div>
  </Link>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

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

      const fetchData = async () => {
        try {
          const requests = [
            axios.get(`${API}/v1/user/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/v1/notices`, { headers: { Authorization: `Bearer ${token}` } }),
          ];
          // Fetch teacher's assigned classes from the dedicated endpoint
          if (decoded.role === 'teacher' || decoded.role === 'admin') {
            requests.push(axios.get(`${API}/v1/user/classes`, { headers: { Authorization: `Bearer ${token}` } }));
          }
          const [subR, notR, classR] = await Promise.all(requests);
          setSubjects(subR.data || []);
          setNotices((notR.data.notices || []).slice(0, 5));
          if (classR) {
            const classes = classR.data || [];
            setTeacherClasses(classes);
            // Auto-select if there's only one class
            if (classes.length === 1) {
              setPostForm(p => ({ ...p, classId: classes[0]._id }));
            }
          }
        } catch (e) { console.error(e); }
        setLoading(false);
      };
      fetchData();

      const socket = initializeSocket(decoded.id, decoded.classId, decoded.role);
      if (socket) {
        console.log("📡 Dashboard socket initialized and ready");
        const handleNew = n => {
          console.log("📢 Real-time notice received on Dashboard:", n.title);
          setNotices(p => {
            // Avoid duplicates
            if (p.some(x => x._id === n._id)) return p;
            return [n, ...p].slice(0, 5);
          });
        };
        socket.on('notice_created', handleNew);
        return () => {
          console.log("🔌 Removing Dashboard socket listener");
          socket.off('notice_created', handleNew);
        };
      }
    } catch (e) { console.error(e); setLoading(false); }
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();

    // Client-side guard: class must be selected when target is CLASS
    if (postForm.targetType === 'CLASS' && !postForm.classId) {
      toast.error('Please select a class to broadcast to.');
      return;
    }
    if (postForm.targetType === 'SUBJECT' && !postForm.subjectId) {
      toast.error('Please select a subject to broadcast to.');
      return;
    }

    setPosting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/v1/notices/add`, postForm, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Announcement broadcast successfully!');
      setPostForm({ title: '', content: '', targetType: 'CLASS', classId: teacherClasses.length === 1 ? teacherClasses[0]._id : '', subjectId: '', priority: 'medium' });
      setShowForm(false);
      const r = await axios.get(`${API}/v1/notices`, { headers: { Authorization: `Bearer ${token}` } });
      setNotices((r.data.notices || []).slice(0, 5));
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send announcement. Please try again.');
    }
    setPosting(false);
  };

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--c-muted)' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: '0.9rem' }}>Loading your dashboard...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const quickLinks = [
    { to: '/attendance', icon: CheckSquare, label: 'QR Attendance', desc: 'Mark or view attendance', color: '#34d399', roles: ['teacher', 'student'] },
    { to: '/marks', icon: GraduationCap, label: 'Marks & AI Coach', desc: 'Results and AI insights', color: '#fbbf24', roles: ['teacher', 'student'] },
    { to: '/notes', icon: BookOpen, label: 'Notes', desc: 'Resources & study notes', color: '#fb923c', roles: ['teacher', 'student'] },
    { to: '/notices', icon: Bell, label: 'Notices', desc: 'Official announcements', color: '#f43f5e', roles: ['admin', 'teacher', 'student'] },
    { to: '/chat', icon: Sparkles, label: 'AI Assistant', desc: 'Chat with AI tutor', color: '#a78bfa', roles: ['teacher', 'student', 'admin'] },
    { to: '/profile', icon: FileText, label: 'My Profile', desc: 'Edit info & avatar', color: '#94a3b8', roles: ['admin', 'teacher', 'student'] },
  ].filter(l => l.roles.includes(user?.role));

  const accentColor = user?.role === 'admin' ? '#f43f5e' : user?.role === 'teacher' ? '#06b6d4' : '#6366f1';
  const roleLabel = user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── WELCOME BANNER ── */}
      <div style={{
        padding: '40px', borderRadius: 28,
        background: `linear-gradient(135deg, ${accentColor}15 0%, var(--c-surface) 100%)`,
        border: `1px solid var(--c-border)`,
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24,
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 250, height: 250, borderRadius: '50%',
          background: accentColor + '10', filter: 'blur(60px)',
          pointerEvents: 'none'
        }} />

        <div style={{ flex: '1 1 400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{
              fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: accentColor,
              background: accentColor + '15', border: `1px solid ${accentColor}30`,
              padding: '4px 14px', borderRadius: 12
            }}>{roleLabel} Identity</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-accent)', boxShadow: `0 0 10px var(--c-accent)` }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-muted)' }}>System Online</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
            fontWeight: 800, color: 'var(--c-text)',
            lineHeight: 1.1, marginBottom: 8,
            letterSpacing: '-0.02em'
          }}>
            Greetings, {user?.name?.split(' ')[0]}!
          </h1>
          <p style={{ color: 'var(--c-muted)', fontSize: '1.05rem', fontWeight: 500 }}>
            Master your academic workflow with EduSmart's intelligent tools.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%', smWidth: 'auto' }}>
          {(isTeacher || isAdmin) && (
            <button onClick={() => setShowForm(t => !t)} style={{
              padding: '14px 32px', borderRadius: 18, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              color: 'white', fontWeight: 700, fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: `0 10px 25px ${accentColor}40`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                e.currentTarget.style.boxShadow = `0 15px 35px ${accentColor}60`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = `0 10px 25px ${accentColor}40`;
              }}
            >
              {showForm ? <X size={18} /> : <Send size={18} />}
              {showForm ? 'Cancel' : (isMobile ? 'Broadcast' : 'New Announcement')}
            </button>
          )}
          <Link to="/profile" style={{
            padding: '14px 32px', borderRadius: 18, textDecoration: 'none',
            background: 'var(--c-surface)', color: 'var(--c-text)',
            fontWeight: 700, fontSize: '0.9rem', border: '1px solid var(--c-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--c-surface)'}
          >
            Manage Profile
          </Link>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="responsive-grid-sm">
        <StatCard icon={BookOpen} label="Subjects" value={subjects.length} color="#fbbf24" sub="enrolled" />
        <StatCard icon={Bell} label="Notices" value={notices.length} color={accentColor} sub="recent" />
        <StatCard icon={TrendingUp} label="Status" value="Active" color="#34d399" />
        <StatCard icon={Award} label="Role" value={roleLabel} color={accentColor} />
      </div>

      {/* ── BROADCAST FORM ── */}
      {showForm && (isTeacher || isAdmin) && (
        <div style={{
          background: 'var(--c-card-bg)', border: `1px solid ${accentColor}40`,
          borderRadius: 24, padding: '32px',
          boxShadow: `0 25px 50px rgba(0,0,0,0.15)`,
          animation: 'fadeUp 0.4s cubic-bezier(0.2, 1, 0.3, 1) forwards',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: accentColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Megaphone size={22} color={accentColor} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--c-text)', margin: 0 }}>
                Global Broadcast
              </h2>
              <p style={{ color: 'var(--c-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Your message will reach targeted groups instantly.</p>
            </div>
          </div>

          <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 20 }}>
              <InputField label="Headline" placeholder="E.g., Semester Exam Schedule Updated" value={postForm.title}
                onChange={e => setPostForm(p => ({ ...p, title: e.target.value }))} accent={accentColor} />

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--c-muted)', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audience Reach</label>
                <select value={postForm.targetType} onChange={e => {
                  const newType = e.target.value;
                  const autoClassId = newType === 'CLASS' && teacherClasses.length === 1 ? teacherClasses[0]._id : '';
                  setPostForm(p => ({ ...p, targetType: newType, classId: autoClassId, subjectId: '' }));
                }} style={inputStyle(accentColor)}>
                  <option value="CLASS">Selected Class</option>
                  <option value="SUBJECT">Specific Subject</option>
                  {isAdmin && <option value="ALL">Entire Campus</option>}
                  {isAdmin && <option value="ROLE">Role Based</option>}
                </select>
              </div>
            </div>

            {postForm.targetType === 'CLASS' && (
              <div style={{ animation: 'fadeUp 0.3s ease' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--c-muted)', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target Class
                  {teacherClasses.length === 0 && <span style={{ marginLeft: 8, color: '#f87171' }}>— No active assignments</span>}
                </label>
                <select value={postForm.classId} onChange={e => setPostForm(p => ({ ...p, classId: e.target.value }))}
                  style={inputStyle(accentColor)} required disabled={teacherClasses.length === 0}>
                  <option value="">— Choose a class —</option>
                  {teacherClasses.map(c => <option key={c._id} value={c._id}>{c.name} {c.section && `(${c.section})`}</option>)}
                </select>
              </div>
            )}

            {postForm.targetType === 'SUBJECT' && (
              <div style={{ animation: 'fadeUp 0.3s ease' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--c-muted)', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Subject</label>
                <select value={postForm.subjectId} onChange={e => { const s = subjects.find(x => x._id === e.target.value); setPostForm(p => ({ ...p, subjectId: e.target.value, classId: s?.classId?._id || '' })); }} style={inputStyle(accentColor)} required>
                  <option value="">— Choose a subject —</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            )}

            <textarea placeholder="Write your detailed announcement here..." value={postForm.content} onChange={e => setPostForm(p => ({ ...p, content: e.target.value }))} required rows={4}
              style={{ ...inputStyle(accentColor), resize: 'none' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {['low', 'medium', 'high', 'urgent'].map(p => (
                  <button key={p} type="button" onClick={() => setPostForm(x => ({ ...x, priority: p }))} style={{
                    padding: '8px 16px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid',
                    background: postForm.priority === p ? (priorityStyle[p]?.bg) : 'var(--c-surface)',
                    borderColor: postForm.priority === p ? priorityStyle[p]?.border : 'var(--c-border)',
                    color: postForm.priority === p ? priorityStyle[p]?.text : 'var(--c-muted)',
                    transition: 'all 0.2s',
                  }}>{p}</button>
                ))}
              </div>
              <button type="submit" disabled={posting} style={{
                padding: '14px 36px', borderRadius: 16, border: 'none', cursor: posting ? 'not-allowed' : 'pointer',
                background: posting ? 'var(--c-muted)' : `linear-gradient(135deg,${accentColor},${accentColor}dd)`,
                color: 'white', fontWeight: 800, fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: posting ? 'none' : `0 10px 25px ${accentColor}40`,
                transition: 'all 0.3s'
              }}>
                {posting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
                {posting ? 'Broadcasting…' : 'Publish Notice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TWO-COLUMN VIEW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>

        {/* Quick Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionHeading label="System Shortcuts" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {quickLinks.map(l => <QuickCard key={l.to} {...l} />)}
          </div>
        </div>

        {/* Intelligence / Notices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <SectionHeading label="Recent Broadcasts" noMargin />
              <Link to="/notices" style={{ fontSize: '0.8rem', color: accentColor, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Audit Logs <ChevronRight size={14} />
              </Link>
            </div>
            {notices.length === 0 ? (
              <div style={{
                padding: '40px', borderRadius: 24,
                background: 'var(--c-surface)', border: '2px dashed var(--c-border)',
                textAlign: 'center'
              }}>
                <Bell size={32} color="var(--c-muted)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p style={{ fontSize: '0.9rem', color: 'var(--c-muted)', fontWeight: 500 }}>No communications logs found</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {notices.map(n => (
                  <div key={n._id} style={{
                    padding: '20px', borderRadius: 20,
                    background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                    borderLeft: `4px solid ${priorityStyle[n.priority]?.text || 'var(--c-primary)'}`,
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.borderColor = accentColor + '30';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.borderColor = 'var(--c-border)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.3, flex: 1, margin: 0 }}>{n.title}</p>
                      <Pill label={n.priority} style={priorityStyle[n.priority] || priorityStyle.medium} />
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--c-muted)', lineHeight: 1.5, margin: 0 }} className="line-clamp-2">{n.content}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--c-border)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <Clock size={12} /> {formatTimeAgo(n.createdAt)}
                      </span>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-muted)', opacity: 0.3 }} />
                      <span style={{ fontSize: '0.7rem', color: 'var(--c-text)', fontWeight: 700 }}>{n.createdBy?.name || 'System'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subjects */}
          {!isAdmin && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <SectionHeading label={isTeacher ? 'Instructional Modules' : 'Assigned Subjects'} noMargin />
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700,
                  color: accentColor, background: accentColor + '10',
                  padding: '4px 12px', borderRadius: 10
                }}>{subjects.length} {isTeacher ? 'Units' : 'Active'}</span>
              </div>
              {subjects.length === 0 ? (
                <div style={{
                  padding: '30px', borderRadius: 24,
                  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--c-muted)', fontWeight: 500 }}>No curriculum data available</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
                  {subjects.slice(0, 6).map(sub => (
                    <div key={sub._id} style={{
                      padding: '20px', borderRadius: 20,
                      background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.01)',
                      cursor: 'pointer'
                    }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.background = 'var(--c-surface-hover)';
                        e.currentTarget.style.borderColor = '#fbbf2440';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(251,191,36,0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = '';
                        e.currentTarget.style.background = 'var(--c-surface)';
                        e.currentTarget.style.borderColor = 'var(--c-border)';
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.01)';
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: '#fbbf2415', border: '1px solid #fbbf2430',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 14
                      }}>
                        <BookOpen size={20} color="#fbbf24" />
                      </div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--c-text)', marginBottom: 4, lineHeight: 1.3 }}>{sub.name}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--c-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>{sub.code}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
                @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                @keyframes spin   { to   { transform:rotate(360deg); } }
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;  
                    overflow: hidden;
                }
            `}</style>
    </div>
  );
}

const SectionHeading = ({ label, noMargin }) => (
  <p style={{
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: 800,
    color: 'var(--c-text)',
    marginBottom: noMargin ? 0 : 20,
    letterSpacing: '-0.01em'
  }}>{label}</p>
);

const inputStyle = (accent) => ({
  width: '100%', padding: '14px 18px', borderRadius: 14,
  background: 'var(--c-input-bg)', border: '1px solid var(--c-border)',
  color: 'var(--c-text)', fontSize: '0.95rem', outline: 'none',
  fontFamily: 'inherit', transition: 'all 0.25s ease',
});

const InputField = ({ label, placeholder, value, onChange, accent }) => (
  <div>
    <label style={{
      display: 'block', fontSize: '0.75rem', color: 'var(--c-muted)',
      fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em'
    }}>{label}</label>
    <input type="text" placeholder={placeholder} value={value} onChange={onChange} required
      style={inputStyle(accent)}
      onFocus={e => { e.target.style.borderColor = accent + '80'; e.target.style.boxShadow = `0 0 0 4px ${accent}15`; }}
      onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
    />
  </div>
);
