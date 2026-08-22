/**
 * Shared AuthLayout – wraps all login / register pages.
 * Clean, simple design without excessive effects.
 */
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

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

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 16px",
            background: "var(--c-bg)",
        }}>
            <div style={{ width: "100%", maxWidth: 400 }}>
                {/* Back button */}
                <button onClick={() => navigate("/")} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "none", border: "none", color: "var(--c-muted)",
                    fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
                    marginBottom: 24, padding: 0,
                }}>
                    <ArrowLeft size={14} /> Back
                </button>

                {/* Card */}
                <div style={{
                    background: "var(--c-card-bg)",
                    border: "1px solid var(--c-border)",
                    borderRadius: 16,
                    padding: "32px 28px",
                }}>
                    {/* Header */}
                    <div style={{ textAlign: "center", marginBottom: 28 }}>
                        {Icon && (
                            <div style={{
                                width: 44, height: 44, borderRadius: 12, margin: "0 auto 14px",
                                background: accentColor + "15",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <Icon size={22} color={accentColor} />
                            </div>
                        )}
                        <h1 style={{
                            fontSize: "1.4rem", fontWeight: 700,
                            color: "var(--c-text)", margin: 0,
                        }}>{title}</h1>
                        <p style={{ fontSize: "0.85rem", color: "var(--c-muted)", marginTop: 6 }}>{subtitle}</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            marginBottom: 16, padding: "10px 14px", borderRadius: 8,
                            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                        }}>
                            <p style={{ fontSize: "0.82rem", color: "#fca5a5", margin: 0 }}>{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {children}

                        <button type="submit" disabled={loading} style={{
                            marginTop: 8,
                            padding: "11px",
                            borderRadius: 10,
                            border: "none",
                            background: loading ? "var(--c-muted)" : accentColor,
                            color: "white",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            cursor: loading ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        }}>
                            {loading ? "Signing in…" : isRegister ? "Create Account" : "Sign In"}
                        </button>
                    </form>

                    {/* Toggle */}
                    {role && (
                        <div style={{
                            marginTop: 18, paddingTop: 16,
                            borderTop: "1px solid var(--c-border)",
                            textAlign: "center",
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
        </div>
    );
};

// Reusable styled field
export const AuthField = ({ label, id, type = "text", value, onChange, placeholder }) => {
    const [showPass, setShowPass] = useState(false);
    const isPassword = type === "password";
    const actualType = isPassword ? (showPass ? "text" : "password") : type;

    return (
        <div>
            <label htmlFor={id} style={{
                display: "block", fontSize: "0.75rem", fontWeight: 600,
                color: "var(--c-muted)", marginBottom: 6,
                textTransform: "uppercase", letterSpacing: "0.05em"
            }}>{label}</label>
            <div style={{ position: 'relative' }}>
                <input
                    id={id} type={actualType} value={value}
                    onChange={onChange} placeholder={placeholder} required
                    style={{
                        width: "100%", padding: "10px 14px", borderRadius: 10,
                        background: "var(--c-input-bg)", border: "1px solid var(--c-border)",
                        color: "var(--c-text)", fontSize: "0.9rem", outline: "none",
                        fontFamily: "inherit", boxSizing: "border-box",
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--c-primary)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; }}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)',
                            fontSize: '0.75rem', fontWeight: 600,
                        }}
                    >{showPass ? 'Hide' : 'Show'}</button>
                )}
            </div>
        </div>
    );
};

export default AuthLayout;
