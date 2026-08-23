export default function PageLoader() {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 16 }}>
            <div style={{ width: 36, height: 36, border: "3px solid var(--c-border)", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
            <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--c-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Loading</p>
        </div>
    );
}
