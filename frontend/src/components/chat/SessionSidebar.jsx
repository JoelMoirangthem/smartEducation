import { useState, useMemo } from "react";
import { Plus, MessageSquare, Trash2, Search, Clock } from "lucide-react";

// Claude sidebar — warm paper, grouped, compact. Exact Claude: 260px, beige #F9F5EB in light
export default function SessionSidebar({ sessions, currentSessionId, onNew, onLoad, onDelete, accent = "#D97706" }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return sessions;
    const t = q.toLowerCase();
    return sessions.filter(s => (s.title || "").toLowerCase().includes(t));
  }, [sessions, q]);

  const grouped = useMemo(() => {
    const now = new Date();
    const today = new Date(now); today.setHours(0,0,0,0);
    const yest = new Date(today); yest.setDate(yest.getDate()-1);
    const g = { today: [], yesterday: [], earlier: [] };
    filtered.forEach(s => {
      const d = new Date(s.updatedAt || s.createdAt); d.setHours(0,0,0,0);
      if (d.getTime() === today.getTime()) g.today.push(s);
      else if (d.getTime() === yest.getTime()) g.yesterday.push(s);
      else g.earlier.push(s);
    });
    return g;
  }, [filtered]);

  const Group = ({ label, items }) => {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ag-muted)", marginBottom: 8, padding: "0 4px" }}>{label}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map(s => {
            const active = currentSessionId === s._id;
            return (
              <div
                key={s._id}
                onClick={() => onLoad(s._id)}
                style={{
                  padding: "9px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 9,
                  cursor: "pointer", border: "1px solid transparent",
                  background: active ? "var(--ag-panel)" : "transparent",
                  borderColor: active ? "var(--ag-border)" : "transparent",
                  color: active ? "var(--ag-text)" : "var(--ag-muted)",
                  transition: "all 0.12s",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "var(--ag-faint)"; } }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ width: 22, height: 22, borderRadius: 6, background: active ? "var(--ag-accent-soft)" : "transparent", border: `1px solid ${active ? "var(--ag-border)" : "transparent"}`, display: "grid", placeItems: "center", flexShrink: 0, color: active ? "var(--ag-accent)" : "var(--ag-muted)" }}>
                  <MessageSquare size={11} strokeWidth={2} />
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: "0.84rem", fontWeight: active ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>{s.title || "Untitled conversation"}</span>
                {active && (
                  <button onClick={(e) => onDelete(e, s._id)} title="Delete" style={{ border: "none", background: "transparent", color: "var(--ag-muted)", cursor: "pointer", width: 22, height: 22, borderRadius: 6, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside style={{
      width: 260, height: "100%", display: "flex", flexDirection: "column",
      background: "var(--ag-bg-soft)", borderRight: "1px solid var(--ag-border)",
      overflow: "hidden", flexShrink: 0,
    }}>
      {/* Claude top: logo + new chat */}
      <div style={{ padding: "16px 12px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "0 2px" }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: "#D97706", display: "grid", placeItems: "center", color: "white", fontWeight: 800, fontSize: "0.78rem", letterSpacing: "-0.02em", flexShrink: 0 }}>◐</span>
          <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ag-text)", letterSpacing: "-0.01em" }}>Claude</span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "0.58rem", letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 7px", borderRadius: 999, background: "var(--ag-panel)", border: "1px solid var(--ag-border)", color: "var(--ag-muted)", fontWeight: 700 }}>EduSmart</span>
        </div>
        <button onClick={onNew} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10,
          background: "var(--ag-accent)", color: "white", border: "1px solid var(--ag-accent)", cursor: "pointer", fontWeight: 600, fontSize: "0.84rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", transition: "all 0.12s",
        }} onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.05)"} onMouseLeave={e => e.currentTarget.style.filter = ""}>
          <Plus size={14} strokeWidth={2.2} /> New chat
        </button>
        <div style={{ position: "relative", marginTop: 10 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ag-muted)" }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search chats" style={{
            width: "100%", padding: "8px 10px 8px 30px", borderRadius: 8, border: "1px solid var(--ag-border)",
            background: "var(--ag-panel)", color: "var(--ag-text)", fontSize: "0.82rem", outline: "none", fontFamily: "inherit",
          }} />
        </div>
      </div>

      {/* History */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 12px" }} className="chat-scroll">
        {filtered.length === 0 ? (
          <div style={{ padding: "28px 12px", textAlign: "center" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ag-text)", marginBottom: 4 }}>No conversations</p>
            <p style={{ fontSize: "0.76rem", color: "var(--ag-muted)", lineHeight: 1.5 }}>Your chat history will appear here. Start a new chat to begin.</p>
          </div>
        ) : (
          <>
            <Group label="Today" items={grouped.today} />
            <Group label="Yesterday" items={grouped.yesterday} />
            <Group label="Previous 7 days" items={grouped.earlier} />
          </>
        )}
      </div>

      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--ag-border)", display: "flex", alignItems: "center", gap: 8, color: "var(--ag-muted)", fontSize: "0.70rem", fontFamily: "var(--font-mono)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706" }} /> Claude • EduSmart
      </div>
    </aside>
  );
}
