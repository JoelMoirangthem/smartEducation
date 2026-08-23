import { useNavigate } from "react-router-dom";
import { Compass, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
    const navigate = useNavigate();
    return (
        <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
            <div style={{ width: 88, height: 88, borderRadius: 24, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                <Compass size={36} color="#7C3AED" />
            </div>
            <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "clamp(2rem,6vw,3rem)", fontWeight: 800, color: "var(--c-text)", letterSpacing: "-0.04em", marginBottom: 12 }}>404 — Not found</h1>
            <p style={{ color: "var(--c-muted)", maxWidth: 480, lineHeight: 1.6, marginBottom: 28 }}>The page you’re looking for doesn’t exist or was moved. Check the URL or head back.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontWeight: 700, cursor: "pointer" }}>
                    <ArrowLeft size={16} /> Go back
                </button>
                <button onClick={() => navigate("/")} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #7C3AED, #0891B2)", color: "white", fontWeight: 700, cursor: "pointer" }}>
                    <Search size={16} /> Explore EduSmart
                </button>
            </div>
        </div>
    );
}
