import { Bot, Sparkles, ArrowRight, BookOpen, Users, BarChart3, Bell } from "lucide-react";
import Markdown from "./Markdown";
import MessageBubble from "./MessageBubble";
import ActivityTimeline from "./ActivityTimeline";

const AGENT_CARDS = [
  { label: "Show students", desc: "List every student", icon: Users, text: "Show me all students in the system" },
  { label: "Create notice", desc: "Broadcast instantly", icon: Bell, text: "Create a notice for all students about upcoming exams" },
  { label: "Attendance", desc: "Summary & insights", icon: BookOpen, text: "Show my attendance summary" },
  { label: "System stats", desc: "Users • classes", icon: BarChart3, text: "Show me the system statistics" },
];
const TUTOR_CARDS = [
  { label: "Explain a topic", desc: "Clear, stepwise", icon: BookOpen, text: "Explain photosynthesis in simple terms with an analogy" },
  { label: "Make a quiz", desc: "5 MCQs from any note", icon: BarChart3, text: "Create a 5-question quiz on the water cycle" },
  { label: "Study plan", desc: "7-day personal plan", icon: Sparkles, text: "Make me a 7-day study plan for final exams" },
  { label: "Summarize notes", desc: "Key points only", icon: Users, text: "Summarize my latest notes on mathematics" },
];

export default function MessageList({ mode, initialGreeting, messages, live, streamingText, agentError, chatContainerRef, bottomRef, onQuickAction }) {
  const isAgent = mode === "agent";
  const cards = isAgent ? AGENT_CARDS : TUTOR_CARDS;

  return (
    <div ref={chatContainerRef} style={{ flex: 1, overflowY: "auto" }} className="chat-scroll">
      <div style={{ maxWidth: 760, width: "100%", margin: "0 auto", padding: "32px 20px 180px" }}>

        {/* Claude empty — centered, no big gradient, just serif + cards */}
        {initialGreeting && messages.length === 0 && !live && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18, padding: "40px 0 12px" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: isAgent ? "#6D28D9" : "#D97706",
              display: "grid", placeItems: "center", color: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)",
            }}>
              {isAgent ? <Bot size={22} color="white" /> : <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>◐</span>}
            </div>
            <div style={{ maxWidth: 560 }}>
              <h2 style={{ fontFamily: "Newsreader, serif", fontSize: "1.55rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ag-text)", lineHeight: 1.2, margin: 0 }}>
                {isAgent ? "What should we do today?" : "How can I help you learn today?"}
              </h2>
              <div style={{ marginTop: 10, color: "var(--ag-muted)", fontSize: "0.92rem", lineHeight: 1.6 }}>
                <Markdown>{initialGreeting}</Markdown>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, width: "100%", maxWidth: 640, marginTop: 4, textAlign: "left" }}>
              {cards.map((s, i) => {
                const Icon = s.icon;
                return (
                  <button key={i} onClick={() => onQuickAction(s.text)} style={{
                    padding: "12px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
                    background: "var(--ag-panel)", border: "1px solid var(--ag-border)", transition: "all 0.14s",
                  }} onMouseEnter={e => { e.currentTarget.style.background = "var(--ag-panel-hover)"; e.currentTarget.style.borderColor = "var(--ag-border-strong)"; }} onMouseLeave={e => { e.currentTarget.style.background = "var(--ag-panel)"; e.currentTarget.style.borderColor = "var(--ag-border)"; }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--ag-faint)", border: "1px solid var(--ag-border)", display: "grid", placeItems: "center", color: "var(--ag-muted)", flexShrink: 0, marginTop: 1 }}><Icon size={14} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600, fontSize: "0.84rem", color: "var(--ag-text)", lineHeight: 1.2 }}>{s.label}</span>
                      <span style={{ display: "block", fontSize: "0.74rem", color: "var(--ag-muted)", marginTop: 2, lineHeight: 1.3 }}>{s.desc}</span>
                    </span>
                    <ArrowRight size={12} color="var(--ag-muted)" style={{ marginTop: 4, flexShrink: 0, opacity: 0.6 }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => <MessageBubble key={idx} msg={msg} />)}

        {/* Live Claude style: avatar + typing dots + streamed markdown with cursor */}
        {(live || streamingText) && (
          <div style={{ display: "flex", gap: 14, marginTop: 12, marginBottom: 20 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: isAgent ? "#6D28D9" : "#D97706", display: "grid", placeItems: "center", color: "white", flexShrink: 0, marginTop: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <Bot size={14} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0, maxWidth: 720, paddingTop: 2 }}>
              {live && (
                <div style={{ marginBottom: streamingText ? 14 : 0, padding: "10px 12px", borderRadius: 10, background: "var(--ag-faint)", border: "1px solid var(--ag-border)", display: "flex", alignItems: "center", gap: 8, color: "var(--ag-muted)", fontSize: "0.78rem", fontWeight: 600 }}>
                  <span style={{ display: "flex", gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ag-accent)", animation: "claude-typing 1.2s infinite", animationDelay: "0s" }} />
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ag-accent)", animation: "claude-typing 1.2s infinite", animationDelay: "0.15s" }} />
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ag-accent)", animation: "claude-typing 1.2s infinite", animationDelay: "0.3s" }} />
                  </span>
                  {live.thinking ? "Claude is thinking…" : "Generating…"}
                  {live.steps?.length ? <span style={{ marginLeft: 6, padding: "2px 7px", borderRadius: 999, background: "var(--ag-panel)", border: "1px solid var(--ag-border)", fontSize: "0.68rem" }}>{live.steps.length} tools</span> : null}
                </div>
              )}
              {live && live.steps?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <ActivityTimeline intent={live.intent || {}} steps={live.steps || []} thinking={live.thinking} live />
                </div>
              )}
              {streamingText && (
                <div style={{ marginTop: live?.steps?.length ? 12 : 0, color: "var(--ag-text)", fontSize: "0.95rem", lineHeight: 1.7 }}>
                  <Markdown>{streamingText}</Markdown>
                  <span style={{ display: "inline-block", width: 8, height: 14, background: "var(--ag-accent)", marginLeft: 4, verticalAlign: "middle", animation: "claude-cursor 1s step-end infinite", borderRadius: 1, transform: "translateY(2px)" }} />
                </div>
              )}
            </div>
          </div>
        )}

        {isAgent && agentError && !streamingText && (
          <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: "0.84rem", fontWeight: 600 }}>
            ⚠ {agentError}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
