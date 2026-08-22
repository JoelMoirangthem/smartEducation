import { Bot, User } from "lucide-react";
import Markdown from "./Markdown";
import ActivityTimeline from "./ActivityTimeline";

/** One chat message. Model messages may embed a persisted activity timeline (meta). */
export default function MessageBubble({ msg }) {
    if (msg.role === "user") {
        return (
            <div className="ag-rise" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                <div className="ag-glass" style={{
                    maxWidth: "78%", padding: "12px 18px", borderRadius: "20px 20px 4px 20px",
                    fontSize: "0.95rem", lineHeight: 1.6,
                }}>
                    <Markdown>{msg.parts[0].text}</Markdown>
                </div>
            </div>
        );
    }

    return (
        <div className="ag-rise" style={{ display: "flex", gap: 14, marginBottom: 28 }}>
            <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: "linear-gradient(135deg, #8b5cf6, #22d3ee)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 20px rgba(139,92,246,0.25)",
            }}>
                <Bot size={18} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <Markdown>{msg.parts[0].text}</Markdown>
                {msg.meta && (
                    <ActivityTimeline
                        intent={{ subagent: msg.meta.subagent, intent: msg.meta.intent, reasoning: msg.meta.reasoning }}
                        steps={Array.isArray(msg.meta.steps) ? msg.meta.steps : []}
                    />
                )}
            </div>
        </div>
    );
}

export function UserAvatar() {
    return <User size={16} />;
}
