/**
 * Shared AuthLayout – wraps all login / register pages with a
 * centered, fully responsive card that looks great on any screen.
 */
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Star } from "lucide-react";
import InteractiveCharacters from "./InteractiveCharacters";

const roleAssets = {
    admin: {
        emojis: ['🛡️', '🔑', '🏢', '📊', '🔒'],
        glow: 'rgba(244,63,94,0.15)',
        motto: 'System Integrity & Institutional Control'
    },
    teacher: {
        emojis: ['📚', '🍎', '💡', '📝', '🎓'],
        glow: 'rgba(6,182,212,0.15)',
        motto: 'Inspiring Minds & Sculpting Futures'
    },
    student: {
        emojis: ['✏️', '💻', '📖', '🎒', '🌟'],
        glow: 'rgba(99,102,241,0.15)',
        motto: 'Continuous Growth & Personal Achievement'
    }
};

const AuthLayout = ({
    title,
    subtitle,
    accentColor = "#6366f1",
    accentGlow = "rgba(99,102,241,0.4)",
    Icon,
    role,       // "admin" | "teacher" | "student"
    isRegister = false,
    onSubmit,
    loading = false,
    error = "",
    children,
}) => {
    const navigate = useNavigate();
    const assets = roleAssets[role] || roleAssets.student;
    const isLoginSplit = !isRegister;

    const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 900);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isLoginSplit) {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: isMobile ? 'column' : 'row',
                fontFamily: "Inter, sans-serif",
                background: "white",
                color: "#111827"
            }}>
                {/* Left Side: Creative & Interactive (Only on desktop or top of mobile) */}
                <div style={{
                    flex: isMobile ? '0 0 300px' : 1.1,
                    display: 'flex',
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#e5e7eb'
                }}>
                    <InteractiveCharacters />
                </div>

                {/* Right Side: Form */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                    <div style={{ width: '100%', maxWidth: 360 }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: 48 }}>
                            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
                                <Star size={48} fill="#111827" stroke="none" />
                            </div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', marginBottom: 12, letterSpacing: '-0.02em' }}>Welcome back!</h1>
                            <p style={{ color: '#6b7280', fontSize: '1rem' }}>Please enter your details</p>
                        </div>

                        {/* Error alert */}
                        {error && (
                            <div style={{ marginBottom: 24, padding: "12px 16px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fee2e2", display: "flex", alignItems: "center", gap: 10 }}>
                                <p style={{ fontSize: "0.82rem", color: "#ef4444", margin: 0, fontWeight: 500 }}>{error}</p>
                            </div>
                        )}

                        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            {React.Children.map(children, child =>
                                React.isValidElement(child) ? React.cloneElement(child, { isSplit: true }) : child
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#374151', cursor: 'pointer' }}>
                                    <input type="checkbox" style={{ width: 16, height: 16, border: '1px solid #d1d5db', borderRadius: 4 }} />
                                    Remember for 30 days
                                </label>
                                <a href="#" style={{ fontSize: '0.82rem', fontWeight: 600, color: accentColor, textDecoration: 'none' }}>Forgot password?</a>
                            </div>

                            <button type="submit" disabled={loading} style={{
                                marginTop: 12,
                                padding: "14px",
                                borderRadius: 8,
                                border: "none",
                                background: loading ? "#f3f4f6" : "#111827",
                                color: "white",
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                cursor: loading ? "not-allowed" : "pointer",
                                transition: "opacity 0.2s ease",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            }}
                                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.9"; }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                            >
                                {loading ? "Signing in..." : "Sign In"}
                            </button>
                        </form>

                        {/* Back Portal Button */}
                        <div style={{ marginTop: 24, textAlign: 'center' }}>
                            <button onClick={() => navigate("/")} style={{
                                background: 'transparent', border: 'none', color: '#6b7280',
                                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                            }}>
                                <ArrowLeft size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                                Back to Portal Selection
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default Immersive Layout for Register/Others
    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 16px",
            fontFamily: "Inter, sans-serif",
            position: "relative",
            background: "var(--c-bg)",
            zIndex: 1,
            overflow: "hidden"
        }}>
            {/* Dynamic Aura Background */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                <div style={{
                    position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%',
                    background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
                    filter: 'blur(100px)', animation: 'float 20s infinite alternate'
                }} />
                <div style={{
                    position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '60%',
                    background: `radial-gradient(circle, ${accentColor}10 0%, transparent 70%)`,
                    filter: 'blur(120px)', animation: 'float 25s infinite alternate-reverse'
                }} />
            </div>

            {/* Floating Animated Emojis */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                {assets.emojis.map((emoji, idx) => (
                    <div key={idx} style={{
                        position: 'absolute',
                        fontSize: '2rem',
                        opacity: 0.15,
                        top: `${Math.random() * 80 + 10}%`,
                        left: `${Math.random() * 80 + 10}%`,
                        animation: `floatingIcon ${6 + idx * 2}s ease-in-out infinite`,
                        animationDelay: `${idx * 0.5}s`,
                        filter: 'grayscale(0.5) contrast(1.2)'
                    }}>{emoji}</div>
                ))}
            </div>

            {/* Card Container */}
            <div style={{
                width: "100%",
                maxWidth: 440,
                zIndex: 10,
                animation: 'authFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}>
                <div style={{
                    background: "var(--c-card-bg)",
                    border: "1px solid var(--c-border)",
                    borderRadius: 28,
                    padding: "48px 40px",
                    boxShadow: "0 25px 60px -15px rgba(0,0,0,0.15)",
                    backdropFilter: "blur(25px) saturate(160%)",
                    position: "relative",
                    overflow: "hidden",
                }}>
                    {/* Top Accent Line */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(to right, transparent, ${accentColor}, transparent)` }} />



                    {/* Header Back Button */}
                    <button onClick={() => navigate("/")} style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        background: "var(--c-surface)", border: "1px solid var(--c-border)", cursor: "pointer",
                        color: "var(--c-muted)", fontSize: "0.72rem",
                        fontWeight: 700, marginBottom: 40, padding: "8px 14px", borderRadius: 12,
                        transition: "all 0.3s ease", textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}
                        onMouseEnter={e => { e.currentTarget.style.color = "var(--c-text)"; e.currentTarget.style.background = "var(--c-surface-hover)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--c-muted)"; e.currentTarget.style.background = "var(--c-surface)"; }}
                    >
                        <ArrowLeft size={14} /> Back to Portal Selection
                    </button>

                    {/* Header */}
                    <div style={{ marginBottom: 32, textAlign: "center" }}>
                        {Icon && (
                            <div style={{
                                width: 52, height: 52, borderRadius: 14, margin: "0 auto 18px",
                                background: "var(--c-surface)",
                                border: "1px solid var(--c-border)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <Icon size={24} color={accentColor} strokeWidth={2} />
                            </div>
                        )}



                        <h1 style={{
                            fontFamily: "Space Grotesk, sans-serif",
                            fontSize: "1.75rem", fontWeight: 800,
                            color: "var(--c-text)", lineHeight: 1.15, marginBottom: 8,
                        }}>{title}</h1>

                        <p style={{ fontSize: "0.85rem", color: "var(--c-muted)", lineHeight: 1.5 }}>{subtitle}</p>
                    </div>

                    {/* Error alert */}
                    {error && (
                        <div style={{
                            marginBottom: 20, padding: "12px 16px", borderRadius: 12,
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            display: "flex", alignItems: "center", gap: 10,
                            animation: "scaleIn 0.3s ease",
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                            <p style={{ fontSize: "0.82rem", color: "#fca5a5", margin: 0, fontWeight: 500 }}>{error}</p>
                        </div>
                    )}

                    {/* Form content */}
                    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {children}

                        {/* Submit */}
                        <button type="submit" disabled={loading} style={{
                            marginTop: 8,
                            padding: "13px",
                            borderRadius: 12,
                            border: "none",
                            background: loading
                                ? "rgba(255,255,255,0.05)"
                                : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                            color: "white",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            cursor: loading ? "not-allowed" : "pointer",
                            transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                            boxShadow: loading ? "none" : `0 6px 24px ${accentGlow}`,
                            letterSpacing: "0.02em",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        }}
                            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 12px 36px ${accentGlow}`; } }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = loading ? "none" : `0 6px 24px ${accentGlow}`; }}
                        >
                            {loading ? (
                                <>
                                    <span style={{
                                        width: 16, height: 16, borderRadius: "50%",
                                        border: "2px solid rgba(255,255,255,0.3)",
                                        borderTopColor: "white",
                                        animation: "spin 0.7s linear infinite",
                                        display: "inline-block"
                                    }} />
                                    Signing in...
                                </>
                            ) : (isRegister ? "Create Account" : "Sign In")}
                        </button>
                    </form>

                    {/* Toggle login/register */}
                    {role && (
                        <div style={{
                            marginTop: 22, paddingTop: 20,
                            borderTop: "1px solid var(--c-border)",
                            textAlign: "center"
                        }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--c-muted)" }}>
                                {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                            </span>
                            <Link
                                to={isRegister ? `/login/${role}` : `/register/${role}`}
                                style={{ fontSize: "0.8rem", color: accentColor, fontWeight: 600, textDecoration: "none" }}
                            >
                                {isRegister ? "Sign in" : "Register"}
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes authFadeUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes float {
                    0% { transform: translate(0, 0); }
                    50% { transform: translate(50px, 30px); }
                    100% { transform: translate(-20px, 60px); }
                }
                @keyframes floatingIcon {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-30px) rotate(15deg); }
                }
            `}</style>
        </div>
    );
};

// Reusable styled field
export const AuthField = ({ label, id, type = "text", value, onChange, placeholder, accentColor = "#6366f1", isSplit = false }) => {
    const [showPass, setShowPass] = useState(false);
    const isPassword = type === "password";
    const actualType = isPassword ? (showPass ? "text" : "password") : type;

    return (
        <div style={{ marginBottom: isSplit ? 12 : 0 }}>
            <label htmlFor={id} style={{
                display: "block", fontSize: isSplit ? "0.82rem" : "0.78rem",
                fontWeight: isSplit ? 500 : 600,
                color: isSplit ? "#6b7280" : "var(--c-muted)",
                marginBottom: isSplit ? 2 : 6,
                letterSpacing: "0.02em"
            }}>{label}</label>

            <div style={{ position: 'relative' }}>
                <input
                    id={id} type={actualType} value={value}
                    onChange={onChange} placeholder={placeholder} required
                    style={{
                        width: "100%",
                        padding: isSplit ? "8px 0" : "11px 14px",
                        background: isSplit ? "transparent" : "var(--c-input-bg)",
                        border: "none",
                        borderBottom: isSplit ? "1px solid #e5e7eb" : `1px solid var(--c-input-border)`,
                        borderRadius: isSplit ? 0 : 10,
                        color: isSplit ? "#111827" : "var(--c-text)",
                        fontSize: isSplit ? "1rem" : "0.88rem",
                        outline: "none", transition: "all 0.2s ease",
                        fontFamily: "Inter, sans-serif",
                    }}
                    onFocus={e => {
                        if (isSplit) {
                            e.target.style.borderBottomColor = "#111827";
                        } else {
                            e.target.style.borderColor = `${accentColor}80`;
                            e.target.style.boxShadow = `0 0 0 3px ${accentColor}20`;
                            e.target.style.background = `${accentColor}0a`;
                        }
                    }}
                    onBlur={e => {
                        if (isSplit) {
                            e.target.style.borderBottomColor = "#e5e7eb";
                        } else {
                            e.target.style.borderColor = "var(--c-input-border)";
                            e.target.style.boxShadow = "none";
                            e.target.style.background = "var(--c-input-bg)";
                        }
                    }}
                />

                {isPassword && isSplit && (
                    <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        style={{
                            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0
                        }}
                    >
                        {/* Simple eye icon (inline SVG) */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default AuthLayout;
