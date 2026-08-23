/**
 * AuthLayout — Fullscreen Auth-Only Split
 * Distinct from landing: left panel is auth-contextual (not product overview)
 * Right panel: spacious, crisp form with proper gaps
 */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ShieldCheck, Sparkles, Lock, ArrowUpRight,
  KeyRound, Clock, CheckCircle2, Mail, Shield, GraduationCap, Presentation, Layers, Users, Quote
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const roleMeta = {
  admin: {
    accent: "#f43f5e",
    eyebrow: "Admin • Secure portal",
    headline: "Admin",
    headlineItalic: "secure access",
    sub: "Sign in to govern your institution. Users, classes, audit and approvals — protected by HS256 + RBAC.",
    points: [
      { icon: Lock, t: "Encrypted session", d: "JWT HS256 • 24h TTL • auto-clean" },
      { icon: ShieldCheck, t: "Role-aware routing", d: "Auto → /admin/dashboard" },
      { icon: KeyRound, t: "Approval gated", d: "Destructive writes need confirm" },
    ],
    helper: { title: "First time here?", desc: "Create the bootstrap admin in ~90s. No card, no demo data." },
    visualTitle: "Sign-in flow",
    visualSteps: ["Institution email", "Strong password", "Encrypted session issued"],
    quote: "Setup was 90 seconds. The approval cards make destructive actions feel safe.",
    author: "Principal — Delhi Public Model",
  },
  teacher: {
    accent: "#06b6d4",
    eyebrow: "Educator • Classroom portal",
    headline: "Welcome back,",
    headlineItalic: "educator",
    sub: "Sign in with your teacher credentials. Attendance, marks and notices pick up exactly where you left off.",
    points: [
      { icon: KeyRound, t: "Institution email", d: "Use the email your admin added" },
      { icon: Clock, t: "Stay signed in", d: "24h session • re-login is instant" },
      { icon: Shield, t: "Private by default", d: "Your classes only • JWT rooms" },
    ],
    helper: { title: "Need access?", desc: "Ask your admin to add you to a class or subject." },
    visualTitle: "After you sign in",
    visualSteps: ["Dashboard • your classes", "Attendance • Face + QR", "Marks • Notes • Notices"],
    quote: "I sign in once and my 3 sections are already there. No hunting for classes.",
    author: "HOD — Computer Science",
  },
  student: {
    accent: "#6366f1",
    eyebrow: "Learner • Student portal",
    headline: "Welcome back,",
    headlineItalic: "learner",
    sub: "Sign in with your student email to see attendance, marks, notes and your AI tutor — all in one calm space.",
    points: [
      { icon: Mail, t: "Use your student email", d: "The one your teacher registered" },
      { icon: Lock, t: "Private & encrypted", d: "Fernet face • JWT • RBAC" },
      { icon: CheckCircle2, t: "Instant resume", d: "Pick up notes & marks instantly" },
    ],
    helper: { title: "New student?", desc: "Ask your teacher for your login email and initial password." },
    visualTitle: "What opens after sign-in",
    visualSteps: ["Attendance % • heatmap", "Notes • Explain & Quiz", "Marks • AI coaching"],
    quote: "Feels like my personal coach — notes explain, then quiz me, then show trend.",
    author: "B.Tech 3rd year — 1.2k+ learners",
  },
};

const AuthLayout = ({
  title,
  subtitle,
  accentColor = "#6366f1",
  Icon,
  role,
  isRegister = false,
  onSubmit,
  loading = false,
  error = "",
  children,
}) => {
  const navigate = useNavigate();
  const meta = roleMeta[role] || roleMeta.student;
  const accent = accentColor || meta.accent;

  // Register meta override for admin registration
  const displayMeta = isRegister && role === "admin" ? {
    ...meta,
    eyebrow: "Admin • Bootstrap setup",
    headline: "Create your",
    headlineItalic: "institution",
    sub: "This creates the first admin for a new institution. Takes ~90 seconds. No card, no sample data — just your campus.",
    points: [
      { icon: ShieldCheck, t: "Bootstrap only once", d: "One admin, then invite others" },
      { icon: Mail, t: "You own the data", d: "Mongo + Fernet • you control" },
      { icon: Clock, t: "Go live instantly", d: "Login → /admin/dashboard" },
    ],
    visualTitle: "3 steps to live",
    visualSteps: ["1. Create admin account", "2. Sign in securely", "3. Add years → classes → users"],
  } : meta;

  return (
    <div style={{
      minHeight: "100dvh",
      display: "grid",
      gridTemplateColumns: "1.15fr 0.85fr",
      background: "var(--c-bg)",
      overflow: "hidden",
    }}>
      {/* ─── Left: Auth-contextual, not overview ─── */}
      <div style={{
        position: "relative",
        background: "#060816",
        color: "#e8ecf6",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}>
        {/* Subtle textures */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: 0.032, pointerEvents: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")` }} />
        <div aria-hidden="true" style={{ position: "absolute", top: -110, left: -80, width: 560, height: 560, borderRadius: "50%", background: `radial-gradient(closest-side, ${accent}20, transparent 68%)`, filter: "blur(6px)" }} />
        <div aria-hidden="true" style={{ position: "absolute", bottom: -140, right: -40, width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(closest-side, rgba(99,102,241,0.12), transparent 72%)`, filter: "blur(6px)" }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: 0.035, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`, backgroundSize: "38px 38px" }} />

        {/* Top — logo only, no product nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 36px 0", position: "relative", gap: 16 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: "white", color: "#0a0a0f", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 13, border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 8px 20px rgba(0,0,0,0.20)" }}>ES</span>
            <span style={{ lineHeight: 1 }}>
              <span style={{ display: "block", fontFamily: "Newsreader, serif", fontWeight: 700, fontSize: "1.02rem", color: "white", letterSpacing: "-0.02em" }}>EduSmart</span>
              <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.58)", fontWeight: 600 }}>CAMPUS OS • 2026</span>
            </span>
          </Link>
          <Link to="/" style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.70)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
            <ArrowLeft size={13} /> Back to site
          </Link>
        </div>

        {/* Center — auth focused */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "28px 36px 20px", position: "relative", gap: 22, maxWidth: 560, width: "100%", margin: "0 auto" }}>
          {/* Eyebrow */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(10px)", width: "fit-content" }}>
            <span style={{ width: 26, height: 26, borderRadius: 999, background: `${accent}1e`, border: `1px solid ${accent}30`, display: "grid", placeItems: "center", color: accent }}>
              {role === "admin" ? <ShieldCheck size={13} /> : role === "teacher" ? <Presentation size={13} /> : <GraduationCap size={13} />}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.80)", fontWeight: 700 }}>{displayMeta.eyebrow}</span>
          </div>

          <div>
            <h1 style={{ fontFamily: "Newsreader, serif", fontWeight: 600, lineHeight: 0.94, letterSpacing: "-0.05em", fontSize: "clamp(2.0rem, 3.4vw, 3.1rem)", color: "white", margin: 0 }}>
              {displayMeta.headline}<br />
              <span style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.70)" }}>{displayMeta.headlineItalic}</span>
            </h1>
            <p style={{ marginTop: 14, fontSize: "0.96rem", lineHeight: 1.65, color: "rgba(255,255,255,0.66)", maxWidth: 500 }}>
              {displayMeta.sub}
            </p>
          </div>

          {/* Auth visual — distinct from landing product cards */}
          <div style={{
            borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(14px)",
            padding: 16, display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.60)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent, boxShadow: `0 0 0 6px ${accent}22` }} /> {displayMeta.visualTitle}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.10)", padding: "4px 8px", borderRadius: 999 }}>{isRegister ? "Step 1 of 3" : "HS256 • RBAC"}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {displayMeta.visualSteps.map((step, i) => (
                <div key={step} style={{ display: "flex", gap: 12, alignItems: "center", padding: "11px 12px", borderRadius: 12, background: i === 0 ? `linear-gradient(135deg, ${accent}14, rgba(255,255,255,0.03))` : "rgba(255,255,255,0.03)", border: `1px solid ${i === 0 ? accent + "18" : "rgba(255,255,255,0.06)"}` }}>
                  <span style={{ width: 26, height: 26, borderRadius: 999, background: i === 0 ? accent : "rgba(255,255,255,0.08)", color: i === 0 ? "white" : "rgba(255,255,255,0.70)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: "0.70rem", fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: i === 0 ? "white" : "rgba(255,255,255,0.78)" }}>{step}</span>
                  <CheckCircle2 size={14} color={i === 0 ? accent : "rgba(255,255,255,0.32)"} style={{ marginLeft: "auto" }} />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 2 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.06em", padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.60)" }}>bcrypt</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.06em", padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.60)" }}>Fernet at rest</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.06em", padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.60)" }}>24h session</span>
            </div>
          </div>

          {/* Compact points — auth-related, proper gap */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {displayMeta.points.map(p => {
              const I = p.icon;
              return (
                <div key={p.t} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 12px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}14`, border: `1px solid ${accent}20`, display: "grid", placeItems: "center", color: accent, flexShrink: 0, marginTop: 1 }}><I size={15} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: "0.86rem", color: "white", lineHeight: 1.2 }}>{p.t}</span>
                    <span style={{ display: "block", fontSize: "0.76rem", color: "rgba(255,255,255,0.60)", marginTop: 3, lineHeight: 1.4 }}>{p.d}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Helper — only for auth */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 14, background: `linear-gradient(135deg, ${accent}10, transparent)`, border: `1px solid ${accent}16` }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", color: "white", flexShrink: 0 }}><Mail size={14} /></span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontWeight: 700, fontSize: "0.82rem", color: "white" }}>{displayMeta.helper.title}</span>
              <span style={{ display: "block", fontSize: "0.76rem", color: "rgba(255,255,255,0.62)", marginTop: 2 }}>{displayMeta.helper.desc}</span>
            </span>
          </div>
        </div>

        {/* Footer — minimal, not product stats */}
        <div style={{ padding: "18px 36px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "relative" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Shield size={12} /> Encrypted • Audited
          </span>
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.42)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Quote size={12} /> {displayMeta.quote.slice(0, 44)}…
          </span>
        </div>
      </div>

      {/* ─── Right: Form — proper gaps & format ─── */}
      <div style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 28px",
        background: "var(--c-bg)",
        overflow: "auto",
      }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: 0.022, pointerEvents: "none", backgroundImage: `radial-gradient(circle at 1px 1px, var(--c-border-strong) 1px, transparent 0)`, backgroundSize: "28px 28px" }} />
        <div aria-hidden="true" style={{ position: "absolute", top: -90, right: -80, width: 420, height: 420, borderRadius: "50%", background: `radial-gradient(closest-side, ${accent}08, transparent 70%)`, filter: "blur(10px)" }} />

        <div style={{ width: "100%", maxWidth: 440, position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <button onClick={() => navigate("/")} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "var(--c-card-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)",
              fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
              padding: "9px 14px", borderRadius: 999, boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 999, background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-muted)", fontFamily: "var(--font-mono)", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 5px rgba(34,197,94,0.14)" }} /> LIVE
              </span>
              <ThemeToggle />
            </div>
          </div>

          {/* Form card */}
          <div style={{
            background: "var(--c-card-bg)",
            border: "1px solid var(--c-border)",
            borderRadius: 24,
            padding: "26px 26px 22px",
            boxShadow: "var(--shadow-lg)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}90, transparent)` }} />

            {/* Header — tight but breathing */}
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: `${accent}12`, border: `1px solid ${accent}18`,
                display: "grid", placeItems: "center", color: accent, boxShadow: `0 8px 18px ${accent}12`,
              }}>
                {Icon ? <Icon size={20} /> : <Layers size={20} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: "1.22rem", fontWeight: 800, color: "var(--c-text)", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{title}</h1>
                <p style={{ fontSize: "0.84rem", color: "var(--c-muted)", margin: "4px 0 0", lineHeight: 1.5 }}>{subtitle}</p>
              </div>
            </div>

            {/* Role pill + trust */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, background: `${accent}10`, border: `1px solid ${accent}18`, color: accent, fontFamily: "var(--font-mono)", fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                {isRegister ? "Create" : "Sign in"} • {role}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-muted)", fontSize: "0.70rem", fontWeight: 600 }}>
                <Lock size={12} /> Encrypted
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-muted)", fontSize: "0.70rem", fontWeight: 600 }}>
                <ShieldCheck size={12} /> RBAC
              </span>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: "12px 14px", borderRadius: 12,
                background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.14)",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, background: "rgba(239,68,68,0.12)", display: "grid", placeItems: "center", color: "#ef4444", flexShrink: 0, fontWeight: 800, fontSize: "0.74rem" }}>!</span>
                <p style={{ fontSize: "0.84rem", color: "#dc2626", margin: 0, lineHeight: 1.5, fontWeight: 600 }}>{error}</p>
              </div>
            )}

            {/* Fields */}
            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {children}
              </div>

              <button type="submit" disabled={loading} style={{
                marginTop: 4,
                width: "100%",
                padding: "13px 16px",
                borderRadius: 12,
                border: "none",
                background: loading ? "var(--c-muted)" : accent,
                color: "white",
                fontWeight: 800,
                fontSize: "0.92rem",
                letterSpacing: "-0.01em",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: loading ? "none" : `0 10px 20px ${accent}20, 0 2px 6px rgba(0,0,0,0.07)`,
                transition: "all 0.18s",
                opacity: loading ? 0.72 : 1,
              }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.filter = "brightness(1.05)"; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.filter = ""; }}
              >
                {loading ? "Please wait…" : isRegister ? "Create Account" : "Sign In"}
                {!loading && <ArrowUpRight size={16} />}
              </button>

              <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--c-muted)", margin: 0, lineHeight: 1.5 }}>
                Protected by <b style={{ color: "var(--c-text)" }}>bcrypt</b> • <b style={{ color: "var(--c-text)" }}>JWT HS256</b> • Session 24h
              </p>
            </form>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 2 }}>
              <div style={{ flex: 1, height: 1, background: "var(--c-border)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.60rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-muted)", whiteSpace: "nowrap" }}>Secure • 2026</span>
              <div style={{ flex: 1, height: 1, background: "var(--c-border)" }} />
            </div>

            {/* Toggle */}
            {role && (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                padding: "13px 14px",
                borderRadius: 14,
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
              }}>
                <span style={{ fontSize: "0.84rem", color: "var(--c-muted)", fontWeight: 500 }}>
                  {isRegister ? "Already have an account?" : "Don't have an account?"}
                </span>
                <Link
                  to={isRegister ? `/login/${role}` : (role === "admin" ? `/register/admin` : `/login/${role}`)}
                  style={{
                    fontSize: "0.84rem", color: accent, fontWeight: 800, textDecoration: "none",
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 999, background: `${accent}10`, border: `1px solid ${accent}18`
                  }}
                >
                  {isRegister ? "Sign in" : role === "admin" ? "Create admin" : "Create account"} <ArrowUpRight size={13} />
                </Link>
              </div>
            )}
          </div>

          {/* Footer helper */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 999, background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-muted)", fontSize: "0.76rem", fontWeight: 500, textAlign: "center", flexWrap: "wrap", justifyContent: "center" }}>
              <Users size={13} /> Need help? <Link to="/" style={{ color: accent, fontWeight: 700, textDecoration: "none" }}>Contact support</Link> <span style={{ opacity: 0.5 }}>•</span> <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem" }}>Terms • Privacy • DPA</span>
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px){
          div[style*="gridTemplateColumns: 1.15fr"]{ grid-template-columns: 1fr !important; }
          div[style*="gridTemplateColumns: 1.15fr"] > div:first-child{ display:none !important; }
        }
      `}</style>
    </div>
  );
};

// ─—— Field — crisp light/dark, proper gap ─——
export const AuthField = ({ label, id, type = "text", value, onChange, placeholder, accentColor }) => {
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = type === "password";
  const actualType = isPassword ? (showPass ? "text" : "password") : type;
  const accent = accentColor || "#6366f1";

  return (
    <div>
      <label htmlFor={id} style={{
        display: "block", fontSize: "0.68rem", fontWeight: 750,
        color: "var(--c-muted)", marginBottom: 8,
        textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1,
      }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} type={actualType} value={value}
          onChange={onChange} placeholder={placeholder} required
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: "13px 44px 13px 14px", borderRadius: 12,
            background: "var(--c-input-bg)", border: `1.5px solid ${focused ? accent + "50" : "var(--c-input-border)"}`,
            color: "var(--c-text)", fontSize: "0.92rem", outline: "none",
            fontFamily: "inherit", boxSizing: "border-box",
            boxShadow: focused ? `0 0 0 4px ${accent}13, 0 1px 2px rgba(0,0,0,0.04)` : "0 1px 2px rgba(0,0,0,0.04)",
            transition: "all 0.18s var(--ease-out)",
            fontWeight: 500,
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            aria-label={showPass ? "Hide password" : "Show password"}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: "var(--c-surface)", border: "1px solid var(--c-border)", cursor: 'pointer', color: 'var(--c-muted)',
              fontSize: '0.72rem', fontWeight: 750, letterSpacing: "0.04em",
              padding: "6px 10px", borderRadius: 999, lineHeight: 1,
            }}
          >{showPass ? 'Hide' : 'Show'}</button>
        )}
      </div>
    </div>
  );
};

export default AuthLayout;
