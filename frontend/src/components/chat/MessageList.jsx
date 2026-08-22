import { Bot, Sparkles } from "lucide-react";
import Markdown from "./Markdown";
import MessageBubble from "./MessageBubble";
import ActivityTimeline from "./ActivityTimeline";

const AGENT_SUGGESTIONS = [
    { label: "Show all students", icon: "👥", text: "Show me all students in the system" },
    { label: "Create a notice", icon: "📢", text: "Create a notice for all students about upcoming exams" },
    { label: "My attendance", icon: "📋", text: "Show my attendance summary" },
    { label: "System stats", icon: "📊", text: "Show me the system statistics" },
];

/** Scroll area: empty state, message list, live streaming slot. */
export default function MessageList({
    mode, initialGreeting, messages, live, streamingText,
    agentError, chatContainerRef, bottomRef, onQuickAction,
}) {
    const isAgent = mode === "agent";

    return (
        <div ref={chatContainerRef} style={{ flex: 1, overflowY: "auto" }} className="custom-scrollbar">
            <div style={{ maxWidth: 800, width: "100%", margin: "0 auto", padding: "40px 24px 160px" }}>

                {/* Empty state */}
                {initialGreeting && messages.length === 0 && !live && (
                    <div style={{ marginBottom: 40, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 20,
                            background: isAgent
                                ? "linear-gradient(135deg, #8b5cf6, #22d3ee)"
                                : "linear-gradient(135deg, var(--c-primary), #a78bfa)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 16px 32px rgba(139,92,246,0.25)",
                        }}>
                            {isAgent ? <Bot size={28} color="white" /> : <Sparkles size={28} color="white" />}
                        </div>
                        <div style={{ maxWidth: 480 }}>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 8 }}>
                                {isAgent ? "What should I do today?" : "How can I assist your research?"}
                            </h2>
                            <Markdown>{initialGreeting}</Markdown>
                        </div>
                        {isAgent && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8, maxWidth: 500 }}>
                                {AGENT_SUGGESTIONS.map((s, i) => (
                                    <button key={i} onClick={() => onQuickAction(s.text)} className="ag-glass" style={{
                                        padding: "8px 14px", borderRadius: 12, cursor: "pointer",
                                        color: "var(--ag-text, var(--c-text))", fontSize: "0.82rem", fontWeight: 600,
                                        display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                                    }}>
                                        <span>{s.icon}</span> {s.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Persisted / completed messages */}
                {messages.map((msg, idx) => <MessageBubble key={idx} msg={msg} />)}

                {/* Live streaming slot */}
                {(live || streamingText) && (
                    <div style={{ display: "flex", gap: 14, marginBottom: 28 }}>
                        <div style={{
                            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                            background: isAgent ? "linear-gradient(135deg, #8b5cf6, #22d3ee)" : "linear-gradient(135deg, var(--c-primary), #a78bfa)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <Bot size={18} color="white" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {live && (
                                <ActivityTimeline
                                    intent={live.intent || {}}
                                    steps={live.steps || []}
                                    thinking={live.thinking}
                                    live
                                />
                            )}
                            {streamingText && (
                                <div style={{ marginTop: live ? 10 : 0 }}>
                                    <Markdown>{streamingText}</Markdown>
                                    <span style={{
                                        width: 2, height: 16, background: "var(--ag-accent, var(--c-primary))",
                                        display: "inline-block", verticalAlign: "middle", marginLeft: 4,
                                        animation: "ag-blink 1s step-end infinite", borderRadius: 1,
                                    }} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Agent error banner */}
                {isAgent && agentError && !streamingText && (
                    <div style={{
                        marginBottom: 20, padding: "10px 14px", borderRadius: 10,
                        background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                        color: "#ef4444", fontSize: "0.82rem", fontWeight: 600,
                    }}>
                        ⚠ {agentError}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>
        </div>
    );
}
