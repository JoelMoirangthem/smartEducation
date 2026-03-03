import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, GraduationCap, Presentation, ArrowRight, Sparkles } from "lucide-react";
import InteractiveNexBot from "../components/InteractiveNexBot";

const roles = [
    {
        id: "Admin",
        label: "Administrator",
        subtitle: "Full Control",
        icon: ShieldCheck,
        gradient: "linear-gradient(135deg, #f43f5e, #e11d48)",
        glow: "rgba(244,63,94,0.35)",
        border: "rgba(244,63,94,0.3)",
        description: "Manage institution settings, users, academic setup and system configuration."
    },
    {
        id: "Teacher",
        label: "Educator",
        subtitle: "Teach & Inspire",
        icon: Presentation,
        gradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
        glow: "rgba(6,182,212,0.35)",
        border: "rgba(6,182,212,0.3)",
        description: "Upload marks, manage attendance, broadcast announcements, and guide students."
    },
    {
        id: "Student",
        label: "Student",
        subtitle: "Learn & Grow",
        icon: GraduationCap,
        gradient: "linear-gradient(135deg, #6366f1, #4f46e5)",
        glow: "rgba(99,102,241,0.35)",
        border: "rgba(99,102,241,0.3)",
        description: "Access your results, notes, attendance, real-time notices, and AI coaching."
    }
];

const LoginRoleSelection = () => {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(null);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            fontFamily: 'Inter, sans-serif',
            position: "relative",
            pointerEvents: "none",
        }}>
            {/* The 3D Bot background (only on this page) */}
            <InteractiveNexBot hoveredRole={hovered} />

            {/* Background Decorative Trails */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', background: 'var(--c-bg)' }}>
                <div style={{ position: 'absolute', top: '10%', left: '-10%', width: '120%', height: '80%', background: 'radial-gradient(ellipse at center, var(--c-primary) 0%, transparent 70%)', opacity: 0.1, transform: 'rotate(-5deg)', filter: 'blur(100px)' }} />
                <div style={{ position: 'absolute', top: '40%', right: '-20%', width: '100%', height: '40%', background: 'radial-gradient(ellipse at center, var(--c-accent) 0%, transparent 70%)', opacity: 0.08, transform: 'rotate(15deg)', filter: 'blur(80px)' }} />
            </div>

            {/* Header - Layered BEHIND the robot (Robot is at Z: 5) */}
            <div style={{
                textAlign: 'center',
                marginBottom: 60,
                animation: 'fadeUp 0.7s ease-out forwards',
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 1 // Behind robot
            }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 20px', borderRadius: 999,
                    background: 'var(--c-surface)',
                    border: '1px solid var(--c-border)',
                    backdropFilter: 'blur(10px)',
                    marginBottom: 32
                }}>
                    <Sparkles size={14} color="var(--c-primary)" />
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--c-muted)', opacity: 0.8, textTransform: 'uppercase' }}>
                        AI-Powered Education Platform
                    </span>
                </div>

                <h1 style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: 'clamp(2.5rem, 8vw, 5.5rem)',
                    fontWeight: 800,
                    lineHeight: 1,
                    marginBottom: 24,
                    color: 'var(--c-text)',
                    letterSpacing: '-0.04em'
                }}>
                    Welcome to<br />
                    <span style={{
                        background: 'linear-gradient(to right, var(--c-primary), var(--c-accent))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>EduSmart</span>
                </h1>

                <p style={{ fontSize: 'clamp(1rem, 1.2vw, 1.2rem)', color: 'var(--c-muted)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6, fontWeight: 500 }}>
                    The modern platform for intelligent education. Choose your access portal to continue.
                </p>
            </div>

            {/* Role Cards - Layered IN FRONT of the robot */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 20,
                width: '100%',
                maxWidth: 960,
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 10 // In front of robot
            }}>
                {roles.map((role, i) => {
                    const Icon = role.icon;
                    const isHovered = hovered === role.id;
                    return (
                        <button
                            key={role.id}
                            onClick={() => navigate(`/login/${role.id.toLowerCase()}`)}
                            onMouseEnter={() => setHovered(role.id)}
                            onMouseLeave={() => setHovered(null)}
                            style={{
                                position: 'relative',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'flex-start',
                                padding: '32px 28px',
                                borderRadius: 24,
                                border: `1px solid ${isHovered ? role.border : 'var(--c-border)'}`,
                                background: isHovered
                                    ? `var(--c-surface-hover)`
                                    : 'var(--c-surface)',
                                backdropFilter: 'blur(16px) saturate(180%)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.4s cubic-bezier(0.2, 1, 0.3, 1)',
                                transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
                                boxShadow: isHovered
                                    ? `0 20px 40px rgba(0,0,0,0.1), 0 0 20px ${role.glow}`
                                    : '0 4px 20px rgba(0,0,0,0.05)',
                                animationDelay: `${i * 130}ms`,
                                animation: 'fadeUp 0.6s ease-out forwards',
                                opacity: 0
                            }}
                        >
                            {/* Icon */}
                            <div style={{
                                width: 56, height: 56, borderRadius: 16, marginBottom: 22,
                                background: role.gradient,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: isHovered ? `0 8px 24px ${role.glow}` : '0 4px 15px rgba(0,0,0,0.3)',
                                transition: 'all 0.3s ease',
                                transform: isHovered ? 'scale(1.1) rotate(-3deg)' : 'scale(1) rotate(0)'
                            }}>
                                <Icon size={26} color="white" strokeWidth={2} />
                            </div>

                            {/* Labels */}
                            <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{role.subtitle}</p>
                            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.6rem', fontWeight: 700, color: 'var(--c-text)', marginBottom: 12, lineHeight: 1.2 }}>{role.label}</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--c-muted)', opacity: 0.8, lineHeight: 1.6, flex: 1, marginBottom: 28 }}>{role.description}</p>

                            {/* CTA */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: '0.78rem', fontWeight: 700,
                                letterSpacing: '0.04em',
                                color: isHovered ? 'var(--c-primary)' : 'var(--c-muted)',
                                transition: 'all 0.2s ease'
                            }}>
                                Enter Portal
                                <ArrowRight size={14} style={{
                                    transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
                                    transition: 'transform 0.25s ease'
                                }} />
                            </div>

                            {/* Gradient bottom accent bar */}
                            <div style={{
                                position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2,
                                background: role.gradient,
                                borderRadius: '0 0 2px 2px',
                                opacity: isHovered ? 1 : 0,
                                transition: 'opacity 0.3s ease'
                            }} />
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <p style={{ marginTop: 48, fontSize: '0.72rem', color: 'var(--c-muted)', opacity: 0.4 }}>
                © 2026 EduSmart Platform — Secure & AI-Assisted Learning
            </p>
        </div>
    );
};

export default LoginRoleSelection;
