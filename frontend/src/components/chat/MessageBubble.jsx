import { Bot } from "lucide-react";
import Markdown from "./Markdown";
import ActivityTimeline from "./ActivityTimeline";

// Claude-exact bubbles: user = right, warm beige card; assistant = left paper, no bubble, just text with avatar
export default function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  if (isUser) {
    return (
      <div className="ag-rise" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24, paddingLeft: 48 }}>
        <div style={{
          maxWidth: 640, padding: "12px 16px", borderRadius: 16,
          background: "var(--ag-faint)", border: "1px solid var(--ag-border)",
          color: "var(--ag-text)", fontSize: "0.94rem", lineHeight: 1.6,
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}>
          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.parts[0].text}</div>
        </div>
      </div>
    );
  }

  // Assistant — Claude style: 36px avatar left, content max 720, no bubble, just paper
  const hasMeta = !!(msg.meta?.subagent || msg.meta?.steps?.length);
  return (
    <div className="ag-rise" style={{ display: "flex", gap: 14, marginBottom: 28, maxWidth: "100%" }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0, marginTop: 2,
        background: hasMeta ? "#6D28D9" : "#D97706", display: "grid", placeItems: "center",
        color: "white", fontWeight: 800, fontSize: "0.72rem", letterSpacing: "-0.02em", boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.06)",
      }}>
        {hasMeta ? <Bot size={14} color="white" /> : <span style={{ fontFamily: "var(--font-mono)" }}>◐</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0, maxWidth: 720, paddingTop: 2 }}>
        <div style={{ color: "var(--ag-text)", fontSize: "0.95rem", lineHeight: 1.7 }}>
          <Markdown>{msg.parts[0].text}</Markdown>
        </div>
        {msg.meta && (
          <div style={{ marginTop: 14 }}>
            <ActivityTimeline
              intent={{ subagent: msg.meta.subagent, intent: msg.meta.intent, reasoning: msg.meta.reasoning }}
              steps={Array.isArray(msg.meta.steps) ? msg.meta.steps : []}
            />
          </div>
        )}
      </div>
    </div>
  );
}
