import { useState, useEffect, useRef } from "react";
import {
    Send, Bot, Sparkles, User, Plus, Trash2, Loader2,
    ChevronDown, Paperclip, Mic, ArrowUp, Search,
    Image as ImageIcon, Globe, Grid, Clock, MessageSquare, Menu as MenuIcon, X,
    MoreHorizontal
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from "axios";
import { useTheme } from "../context/ThemeContext";

const API = "http://localhost:5000/api/v1";
const THEME = {
    bg: "var(--c-bg)",
    sidebar: "var(--c-sidebar-bg)",
    text: "var(--c-text)",
    muted: "var(--c-muted)",
    inputBg: "var(--c-input-bg)",
    border: "var(--c-border)",
    userMsg: "var(--c-surface)",
    accent: "var(--c-primary)"
};

const mdComponents = {
    p: ({ children }) => <p style={{ marginBottom: '1.25rem', lineHeight: 1.7, color: THEME.text, fontSize: 'clamp(0.95rem, 2vw, 1.05rem)' }}>{children}</p>,
    ul: ({ children }) => <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', marginBottom: '1.25rem', color: THEME.text, fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ listStyleType: 'decimal', paddingLeft: '1.25rem', marginBottom: '1.25rem', color: THEME.text, fontSize: 'clamp(0.95rem, 2vw, 1rem)' }}>{children}</ol>,
    li: ({ children }) => <li style={{ marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>{children}</li>,
    h1: ({ children }) => <h1 style={{ fontWeight: 800, color: 'var(--c-text)', fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', marginBottom: '1rem', marginTop: '1.5rem', fontFamily: 'Space Grotesk, sans-serif' }}>{children}</h1>,
    h2: ({ children }) => <h2 style={{ fontWeight: 700, color: 'var(--c-text)', fontSize: 'clamp(1.1rem, 3.5vw, 1.45rem)', marginBottom: '0.9rem', marginTop: '1.25rem', fontFamily: 'Space Grotesk, sans-serif' }}>{children}</h2>,
    h3: ({ children }) => <h3 style={{ fontWeight: 700, color: 'var(--c-text)', fontSize: 'clamp(1rem, 3vw, 1.25rem)', marginBottom: '0.8rem', marginTop: '1.1rem', fontFamily: 'Space Grotesk, sans-serif' }}>{children}</h3>,
    hr: () => <hr style={{ border: 'none', borderTop: `1px solid ${THEME.border}`, margin: '2rem 0' }} />,
    strong: ({ children }) => <strong style={{ color: 'var(--c-text)', fontWeight: 700 }}>{children}</strong>,
    em: ({ children }) => <em style={{ fontStyle: 'italic', color: 'var(--c-muted)' }}>{children}</em>,
    blockquote: ({ children }) => <blockquote style={{ borderLeft: `3px solid var(--c-primary)`, paddingLeft: '1.1rem', color: 'var(--c-muted)', fontStyle: 'italic', marginBottom: '1.25rem' }}>{children}</blockquote>,
    code: ({ children, inline }) => inline
        ? <code style={{ background: 'var(--c-primary)20', borderRadius: 5, padding: '2px 5px', fontSize: '0.85em', fontFamily: 'monospace', color: 'var(--c-primary)' }}>{children}</code>
        : <div style={{ background: '#0d0d0d', borderRadius: 10, padding: '1.25rem', overflowX: 'auto', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <code style={{ fontFamily: 'Fira Code, monospace', fontSize: 'min(0.85rem, 3.5vw)', color: '#e2e8f0', lineHeight: 1.5 }}>{children}</code>
        </div>,
};

export default function Chat() {
    const { theme } = useTheme();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [streamingText, setStreamingText] = useState("");
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [initialGreeting, setInitialGreeting] = useState("Hello! I am **EduSmart AI**, your intelligent academic assistant. How can I help you learn today?");
    const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false); // Used to trigger engine

    const tokenQueueRef = useRef([]);
    const isTypingRef = useRef(false);

    const bottomRef = useRef(null);
    const textareaRef = useRef(null);
    const chatContainerRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, streamingText, loading]);

    // TYPEWRITER ENGINE: Drains the tokenQueueRef at a steady pace
    useEffect(() => {
        const processQueue = () => {
            if (tokenQueueRef.current.length > 0) {
                const char = tokenQueueRef.current.shift();
                setStreamingText(prev => prev + char);
                typingTimeoutRef.current = setTimeout(processQueue, 15);
            } else {
                isTypingRef.current = false;
                typingTimeoutRef.current = null;
            }
        };

        if (!isTypingRef.current && tokenQueueRef.current.length > 0) {
            isTypingRef.current = true;
            processQueue();
        }
    }, [isTyping]);

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API}/ai/sessions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessions(res.data);
        } catch (e) {
            console.error("Failed to fetch sessions", e);
        }
    };

    const loadSession = async (id) => {
        setLoading(true);
        setInternalSidebarOpen(false);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API}/ai/sessions/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const msgs = res.data.messages.map(m => ({
                role: m.role,
                parts: [{ text: m.content }]
            }));
            setMessages(msgs);
            setCurrentSessionId(id);
            setInitialGreeting("");
        } catch (e) {
            console.error("Failed to load session", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const text = input.trim();
        const userMsg = { role: "user", parts: [{ text }] };

        setMessages(p => [...p, userMsg]);
        setInput("");
        setLoading(true);
        setStreamingText("");
        setInitialGreeting("");

        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        try {
            const token = localStorage.getItem("token");
            const history = messages.map(m => ({ role: m.role, parts: m.parts }));

            const response = await fetch(`${API}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: text, history, sessionId: currentSessionId })
            });

            if (!response.ok) throw new Error("Connection failed");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullAccumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                // If it contains the session marker, handle it separately
                if (chunk.includes("[SESSION_ID:")) {
                    const parts = chunk.split("[SESSION_ID:");
                    if (parts[0]) {
                        fullAccumulated += parts[0];
                        tokenQueueRef.current.push(...parts[0].split(""));
                    }
                    const id = parts[1].replace("]", "");
                    if (id && !currentSessionId) {
                        setCurrentSessionId(id);
                        fetchSessions();
                    }
                } else {
                    fullAccumulated += chunk;
                    tokenQueueRef.current.push(...chunk.split(""));
                }

                // Trigger typewriter if not running
                if (!isTypingRef.current) {
                    setIsTyping(true); // Small hack to trigger the useEffect
                    setTimeout(() => setIsTyping(false), 10);
                }
            }

            // Wait for queue to finish draining
            while (tokenQueueRef.current.length > 0) {
                await new Promise(r => setTimeout(r, 100));
            }

            setMessages(p => [...p, { role: "model", parts: [{ text: fullAccumulated.split("[SESSION_ID:")[0].trim() }] }]);
            setStreamingText("");
        } catch (e) {
            console.error("Chat Error:", e);
            setMessages(p => [...p, { role: "model", parts: [{ text: "⚠️ System error. Please try again." }] }]);
        } finally {
            setLoading(false);
        }
    };

    const deleteSession = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this chat session?")) return;
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`${API}/ai/sessions/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessions(prev => prev.filter(s => s._id !== id));
            if (currentSessionId === id) {
                clearChat();
            }
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    const clearChat = () => {
        setMessages([]);
        setCurrentSessionId(null);
        setStreamingText("");
        setInternalSidebarOpen(false);
        setInitialGreeting("New session started. How can I assist you?");
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextarea = (e) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    };

    const InternalSidebar = () => (
        <aside style={{
            width: 280,
            background: 'var(--c-sidebar-bg)',
            borderRight: `1px solid var(--c-border)`,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 16px',
            flexShrink: 0,
            height: '100%',
            position: 'relative',
            zIndex: 10,
            backdropFilter: 'blur(10px)'
        }}>
            <button
                onClick={clearChat}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 16,
                    background: 'var(--c-surface)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-text)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginBottom: 32,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = 'var(--c-surface-hover)';
                    e.currentTarget.style.borderColor = 'var(--c-primary)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.background = 'var(--c-surface)';
                    e.currentTarget.style.borderColor = 'var(--c-border)';
                }}
            >
                <Plus size={20} color="var(--c-primary)" />
                <span>New Experiment</span>
            </button>

            <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                <p style={{
                    fontSize: '0.7rem', fontWeight: 800, color: 'var(--c-muted)',
                    marginBottom: 16, padding: '0 8px', textTransform: 'uppercase',
                    letterSpacing: '0.12em'
                }}>Recent Interactions</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sessions.map((s) => (
                        <div key={s._id}
                            onClick={() => loadSession(s._id)}
                            style={{
                                padding: '12px 14px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12,
                                cursor: 'pointer',
                                color: currentSessionId === s._id ? 'var(--c-text)' : 'var(--c-muted)',
                                fontSize: '0.88rem',
                                background: currentSessionId === s._id ? 'var(--c-surface-hover)' : 'transparent',
                                border: '1px solid',
                                borderColor: currentSessionId === s._id ? 'var(--c-border)' : 'transparent',
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                fontWeight: currentSessionId === s._id ? 700 : 500
                            }}
                            onMouseEnter={e => {
                                if (currentSessionId !== s._id) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                    e.currentTarget.style.color = 'var(--c-text)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (currentSessionId !== s._id) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--c-muted)';
                                }
                            }}
                        >
                            <MessageSquare size={16} color={currentSessionId === s._id ? 'var(--c-primary)' : 'var(--c-muted)'} />
                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>

                            {currentSessionId === s._id && (
                                <button
                                    onClick={(e) => deleteSession(e, s._id)}
                                    style={{
                                        border: 'none', background: 'transparent', color: 'var(--c-muted)',
                                        cursor: 'pointer', padding: 4, borderRadius: 6,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-muted)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{
                marginTop: 'auto', padding: '20px 8px 0',
                borderTop: `1px solid var(--c-border)`,
                display: 'flex', alignItems: 'center', gap: 12
            }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 14,
                    background: 'linear-gradient(135deg, var(--c-primary), #a78bfa)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 800, fontSize: '0.9rem',
                    boxShadow: '0 4px 12px var(--c-primary)33'
                }}>J</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                        fontSize: '0.9rem', fontWeight: 700, color: 'var(--c-text)',
                        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>Joel Moirang</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--c-muted)', margin: 0 }}>Premium Researcher</p>
                </div>
            </div>
        </aside>
    );

    return (
        <div style={{
            display: 'flex', height: 'calc(100vh - 120px)', margin: '0',
            background: 'var(--c-bg)', color: 'var(--c-text)', overflow: 'hidden', position: 'relative',
            borderRadius: 30, border: `1px solid var(--c-border)`,
            boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
        }}>
            {/* Desktop Internal Sidebar */}
            <div className="hidden lg:block h-full flex-shrink-0">
                <InternalSidebar />
            </div>

            {/* Mobile Internal Sidebar (Overlay) */}
            {internalSidebarOpen && (
                <>
                    <div
                        onClick={() => setInternalSidebarOpen(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
                    />
                    <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 101, animation: 'slideIn 0.3s ease-out' }}>
                        <InternalSidebar />
                    </div>
                </>
            )}

            {/* --- MAIN AREA --- */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0 }}>
                <header style={{
                    height: 70, display: 'flex', alignItems: 'center', padding: '0 24px',
                    justifyContent: 'space-between', borderBottom: `1px solid var(--c-border)`,
                    flexShrink: 0,
                    background: 'var(--c-surface)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={() => setInternalSidebarOpen(true)}
                            style={{
                                background: 'var(--c-surface-hover)', border: '1px solid var(--c-border)',
                                color: 'var(--c-text)', cursor: 'pointer', padding: 8, borderRadius: 10
                            }}
                            className="lg:hidden"
                        >
                            <MenuIcon size={20} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 14px', borderRadius: 12, border: '1px solid transparent', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-surface-hover)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                        >
                            <Sparkles size={18} color="var(--c-primary)" />
                            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--c-text)', letterSpacing: '-0.01em' }}>Intelligence Labs</span>
                            <ChevronDown size={14} color="var(--c-muted)" style={{ marginTop: 2 }} />
                        </div>
                    </div>
                </header>

                <div
                    ref={chatContainerRef}
                    style={{ flex: 1, overflowY: 'auto' }}
                    className="custom-scrollbar"
                >
                    <div style={{ maxWidth: 850, width: '100%', margin: '0 auto', padding: '60px 24px 180px' }}>

                        {initialGreeting && messages.length === 0 && (
                            <div style={{ marginBottom: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20 }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: 22,
                                    background: 'linear-gradient(135deg, var(--c-primary), #a78bfa)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 20px 40px var(--c-primary)33'
                                }}>
                                    <Sparkles size={32} color="white" />
                                </div>
                                <div style={{ maxWidth: 500 }}>
                                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--c-text)', marginBottom: 12 }}>How can I assist your research?</h2>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{initialGreeting}</ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            msg.role === 'user' ? (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
                                    <div style={{
                                        maxWidth: '80%', padding: '16px 24px', borderRadius: '24px 24px 4px 24px',
                                        background: 'var(--c-surface)', color: 'var(--c-text)',
                                        border: `1px solid var(--c-border)`,
                                        fontSize: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                                        lineHeight: 1.6
                                    }}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{msg.parts[0].text}</ReactMarkdown>
                                    </div>
                                </div>
                            ) : (
                                <div key={idx} style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
                                    <div style={{
                                        width: 38, height: 38, borderRadius: 12,
                                        background: 'linear-gradient(135deg, var(--c-primary), #a78bfa)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, boxShadow: '0 8px 16px var(--c-primary)22'
                                    }}>
                                        <Bot size={22} color="white" />
                                    </div>
                                    <div style={{ flex: 1, color: 'var(--c-text)', minWidth: 0 }}>
                                        <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>
                                            {msg.parts[0].text}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )
                        ))}

                        {streamingText && (
                            <div style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 12,
                                    background: 'linear-gradient(135deg, var(--c-primary), #a78bfa)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Bot size={22} color="white" />
                                </div>
                                <div style={{ flex: 1, color: 'var(--c-text)', minWidth: 0 }}>
                                    <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>
                                        {streamingText}
                                    </ReactMarkdown>
                                    <span style={{
                                        width: 3, height: 18, background: 'var(--c-primary)',
                                        display: 'inline-block', verticalAlign: 'middle',
                                        marginLeft: 6, animation: 'blink 1s step-end infinite',
                                        borderRadius: 2
                                    }} />
                                </div>
                            </div>
                        )}

                        {loading && !streamingText && (
                            <div style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 12,
                                    background: 'var(--c-surface)',
                                    border: '1px solid var(--c-border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Loader2 size={20} color="var(--c-primary)" className="animate-spin" />
                                </div>
                                <div style={{
                                    padding: '16px 24px',
                                    background: 'var(--c-surface)',
                                    borderRadius: 20,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    border: `1px solid var(--c-border)`,
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                                }}>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--c-muted)', fontWeight: 600 }}>Analyzing Neural Patterns</span>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        {[0, 1, 2].map(i => (
                                            <div key={i} style={{
                                                width: 5, height: 5, borderRadius: '50%',
                                                background: 'var(--c-primary)',
                                                animation: `blink 1.4s infinite ${i * 0.2}s`,
                                                opacity: 0.6
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '30px 24px', background: `linear-gradient(transparent, var(--c-bg) 60%)`,
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        maxWidth: 760, margin: '0 auto', background: 'var(--c-card-bg)',
                        borderRadius: 24, padding: '10px 14px', border: `1px solid var(--c-border)`,
                        display: 'flex', alignItems: 'flex-end', gap: 12,
                        boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
                        backdropFilter: 'blur(20px)',
                        pointerEvents: 'auto',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleTextarea}
                            onKeyDown={handleKeyDown}
                            placeholder="Message Intelligence Labs..."
                            style={{
                                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                color: 'var(--c-text)', padding: '12px 6px', fontSize: '1rem',
                                resize: 'none', maxHeight: 200, fontFamily: 'inherit',
                                lineHeight: '1.6', fontWeight: 500
                            }}
                            rows={1}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6 }}>
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                style={{
                                    width: 44, height: 44, borderRadius: 14, border: 'none',
                                    background: input.trim() ? 'var(--c-primary)' : 'var(--c-surface-hover)',
                                    color: input.trim() ? 'white' : 'var(--c-muted)',
                                    cursor: input.trim() ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: input.trim() ? '0 10px 20px var(--c-primary)44' : 'none'
                                }}
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowUp size={22} />}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(155,155,155,0.2); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(155,155,155,0.4); }
            `}</style>
        </div>
    );
}
