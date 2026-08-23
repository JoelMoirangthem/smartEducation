import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, info) { console.error("[ErrorBoundary]", error, info); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
                    <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                        <AlertTriangle size={32} color="#ef4444" />
                    </div>
                    <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, fontSize: "1.5rem", color: "var(--c-text)", marginBottom: 8 }}>Something went wrong</h2>
                    <p style={{ color: "var(--c-muted)", maxWidth: 480, marginBottom: 24, lineHeight: 1.6 }}>{this.state.error?.message || "An unexpected error occurred"}</p>
                    <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => this.setState({ hasError: false, error: null })} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 12, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontWeight: 700, cursor: "pointer" }}>
                            <RefreshCw size={16} /> Try again
                        </button>
                        <button onClick={() => window.location.href = "/dashboard"} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #7C3AED, #06b6d4)", color: "white", fontWeight: 700, cursor: "pointer" }}>
                            <Home size={16} /> Go home
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
