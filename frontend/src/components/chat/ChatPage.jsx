import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Sparkles, MessageSquare, Menu as MenuIcon } from "lucide-react";
import axios from "axios";
import api from "../../services/api";
import { AGENT_STYLES } from "./theme";
import SessionSidebar from "./SessionSidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import ApprovalCard from "./ApprovalCard";

const API = api.defaults.baseURL;

const emptyTrail = () => ({ intent: null, subagent: "", reasoning: "", steps: [] });
const stripSteps = (steps) => (steps || []).map(({ startedAt, ...rest }) => rest);

export default function ChatPage() {
    const [mode, setMode] = useState("tutor");
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [streamingText, setStreamingText] = useState("");
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [initialGreeting, setInitialGreeting] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [pendingApproval, setPendingApproval] = useState(null);
    const [approvalBusy, setApprovalBusy] = useState(false);
    const [agentError, setAgentError] = useState("");
    const [live, setLive] = useState(null);

    const fullAnswerRef = useRef("");
    const trailRef = useRef(emptyTrail());
    const streamedTextRef = useRef("");
    const abortRef = useRef(null);
    const pausedRef = useRef(false);
    const chatGenRef = useRef(0);
    const tokenQueueRef = useRef([]);
    const isTypingRef = useRef(false);
    const typingTimeoutRef = useRef(null);
    const bottomRef = useRef(null);
    const chatContainerRef = useRef(null);

    const isAgent = mode === "agent";

    const getGreeting = useCallback(() =>
        isAgent
            ? "Hello! I'm **EduSmart Agent** — I can execute real actions on the platform. Ask me to manage attendance, marks, notices, users, or anything else. I'll do the work and show you every step."
            : "Hello! I am **EduSmart AI**, your intelligent academic assistant. How can I help you learn today?",
        [isAgent]
    );

    useEffect(() => { setInitialGreeting(getGreeting()); }, [mode, getGreeting]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        axios.get(`${API}/ai/sessions`, {
            params: isAgent ? { mode: "agent" } : {},
            headers: { Authorization: `Bearer ${token}` },
        }).then((res) => setSessions(res.data)).catch(() => {});
    }, [isAgent]);

    useEffect(() => {
        if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingText, loading, live, pendingApproval]);

    const kickTypewriter = () => {
        if (isTypingRef.current) return;
        isTypingRef.current = true;
        const processQueue = () => {
            if (tokenQueueRef.current.length > 0) {
                const batch = tokenQueueRef.current.splice(0, 3).join("");
                streamedTextRef.current += batch;
                setStreamingText((prev) => prev + batch);
                typingTimeoutRef.current = setTimeout(processQueue, 5);
            } else {
                isTypingRef.current = false;
                typingTimeoutRef.current = null;
            }
        };
        processQueue();
    };
    const queueText = (text) => {
        tokenQueueRef.current.push(...(text || "").split(""));
        kickTypewriter();
    };
    const flushTypewriter = () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        if (tokenQueueRef.current.length > 0) {
            const rest = tokenQueueRef.current.join("");
            tokenQueueRef.current = [];
            streamedTextRef.current += rest;
            setStreamingText((prev) => prev + rest);
        }
        isTypingRef.current = false;
    };
    const reconcileStream = (full) => {
        flushTypewriter();
        tokenQueueRef.current = [];
        const shown = streamedTextRef.current;
        let common = 0;
        const max = Math.min(shown.length, full.length);
        while (common < max && shown[common] === full[common]) common++;
        fullAnswerRef.current = full;
        streamedTextRef.current = full.slice(0, common);
        setStreamingText(full.slice(0, common));
        const rest = full.slice(common);
        if (rest) queueText(rest);
    };

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API}/ai/sessions`, {
                params: isAgent ? { mode: "agent" } : {},
                headers: { Authorization: `Bearer ${token}` },
            });
            setSessions(res.data);
        } catch { /* ignore */ }
    };
    const loadSession = async (id) => {
        setLoading(true);
        setSidebarOpen(false);
        abortRef.current?.abort();
        chatGenRef.current++;
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${API}/ai/sessions/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMessages(res.data.messages.map((m) => ({
                role: m.role,
                parts: [{ text: m.content }],
                ...(m.meta ? { meta: m.meta } : {}),
            })));
            setCurrentSessionId(id);
            setInitialGreeting("");
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };
    const clearChat = () => {
        abortRef.current?.abort();
        chatGenRef.current++;
        setMessages([]);
        setCurrentSessionId(null);
        setStreamingText("");
        streamedTextRef.current = "";
        setSidebarOpen(false);
        setPendingApproval(null);
        setAgentError("");
        pausedRef.current = false;
        setLive(null);
        trailRef.current = emptyTrail();
        fullAnswerRef.current = "";
        setInitialGreeting(getGreeting());
    };
    const deleteSession = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Delete this chat session?")) return;
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`${API}/ai/sessions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setSessions((prev) => prev.filter((s) => s._id !== id));
            if (currentSessionId === id) clearChat();
        } catch { /* ignore */ }
    };
    const finalizeTurn = (serverMeta) => {
        flushTypewriter();
        const fullAnswer = fullAnswerRef.current.trim();
        const trail = trailRef.current;
        const meta = serverMeta
            || ((trail.subagent || trail.steps.length) ? {
                intent: trail.intent?.intent || "",
                subagent: trail.subagent,
                reasoning: trail.reasoning,
                steps: stripSteps(trail.steps),
            } : undefined);
        if (fullAnswer) {
            setMessages((p) => [...p, { role: "model", parts: [{ text: fullAnswer }], ...(meta ? { meta } : {}) }]);
            fetchSessions();
        }
        fullAnswerRef.current = "";
        setStreamingText("");
        if (!pausedRef.current) {
            setLive(null);
            setPendingApproval(null);
        }
    };
    const consumeAgentStream = async (response, gen) => {
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || "Agent request failed");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let serverMeta = null;
        const snapshotLive = (thinking) => setLive({
            intent: trailRef.current.intent,
            steps: [...trailRef.current.steps],
            thinking: thinking ?? false,
        });
        while (true) {
            const { done, value } = await reader.read();
            if (gen !== chatGenRef.current) { try { reader.cancel(); } catch { /* noop */ } return; }
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl;
            while ((nl = buffer.indexOf("\n")) !== -1) {
                const line = buffer.slice(0, nl).trim();
                buffer = buffer.slice(nl + 1);
                if (!line || !line.startsWith("[EVT] ")) continue;
                let evt;
                try { evt = JSON.parse(line.slice(6)); } catch { continue; }
                switch (evt.type) {
                    case "intent":
                        trailRef.current.intent = { subagent: evt.subagent, intent: evt.intent, reasoning: evt.reasoning, label: evt.label };
                        trailRef.current.subagent = evt.subagent || "";
                        trailRef.current.reasoning = evt.reasoning || "";
                        snapshotLive(true);
                        break;
                    case "agent_start": snapshotLive(true); break;
                    case "agent_done": snapshotLive(false); break;
                    case "tool_start":
                        trailRef.current.steps.push({ name: evt.tool, label: evt.label || evt.tool, status: "running", startedAt: Date.now(), detail: "" });
                        snapshotLive(true); break;
                    case "tool_result": {
                        const steps = trailRef.current.steps;
                        let idx = -1;
                        for (let i = steps.length - 1; i >= 0; i--) if (steps[i].name === evt.tool && steps[i].status === "running") { idx = i; break; }
                        if (idx !== -1) steps[idx] = { ...steps[idx], status: evt.rejected ? "rejected" : (evt.ok ? "ok" : (evt.status === "denied" ? "denied" : "error")), detail: evt.summary || "", duration: Date.now() - (steps[idx].startedAt || Date.now()) };
                        snapshotLive(false); break;
                    }
                    case "approval":
                        pausedRef.current = true;
                        setPendingApproval({ approvalId: evt.approvalId, tool: evt.tool, label: evt.label, severity: evt.severity, preview: evt.preview, args: evt.args });
                        snapshotLive(false); break;
                    case "token": fullAnswerRef.current += evt.text || ""; queueText(evt.text || ""); break;
                    case "answer": if (evt.meta && !serverMeta) serverMeta = evt.meta; reconcileStream(evt.text || ""); break;
                    case "session": if (gen === chatGenRef.current) setCurrentSessionId(evt.id); break;
                    case "error": fullAnswerRef.current += `\n⚠️ ${evt.message}`; queueText(`\n⚠️ ${evt.message}`); setAgentError(evt.message); break;
                    default: break;
                }
            }
        }
        if (gen === chatGenRef.current) finalizeTurn(serverMeta);
    };
    const runAgentTurn = async ({ message, history }, signal, gen) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API}/agent/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ message, history, sessionId: currentSessionId }),
            signal,
        });
        await consumeAgentStream(response, gen);
    };
    const runTutorTurn = async ({ text, history }, signal, gen) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API}/ai/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ message: text, history, sessionId: currentSessionId }),
            signal,
        });
        if (!response.ok) throw new Error("Connection failed");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (gen !== chatGenRef.current) { try { reader.cancel(); } catch { /* noop */ } return; }
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            if (chunk.includes("[SESSION_ID:")) {
                const parts = chunk.split("[SESSION_ID:");
                if (parts[0]) { fullAnswerRef.current += parts[0]; queueText(parts[0]); }
                const id = parts[1]?.replace("]", "");
                if (id && !currentSessionId && gen === chatGenRef.current) { setCurrentSessionId(id); fetchSessions(); }
            } else { fullAnswerRef.current += chunk; queueText(chunk); }
        }
        if (gen === chatGenRef.current) finalizeTurn(null);
    };
    const handleSend = async (overrideText) => {
        const text = (typeof overrideText === "string" ? overrideText : input).trim();
        if (!text || loading || pendingApproval) return;
        setMessages((p) => [...p, { role: "user", parts: [{ text }] }]);
        setInput("");
        setLoading(true);
        setStreamingText("");
        streamedTextRef.current = "";
        tokenQueueRef.current = [];
        setInitialGreeting("");
        setAgentError("");
        trailRef.current = emptyTrail();
        fullAnswerRef.current = "";
        pausedRef.current = false;
        setLive({ intent: null, steps: [], thinking: true });
        const history = messages.map((m) => ({ role: m.role === "model" ? "model" : "user", content: m.parts?.[0]?.text || "", })).filter((m) => m.content);
        const controller = new AbortController();
        abortRef.current = controller;
        const gen = chatGenRef.current;
        try {
            if (isAgent) await runAgentTurn({ message: text, history }, controller.signal, gen);
            else await runTutorTurn({ text, history }, controller.signal, gen);
        } catch (e) {
            if (e.name === "AbortError") finalizeTurn(null);
            else {
                setLive(null); setStreamingText(""); streamedTextRef.current = ""; fullAnswerRef.current = "";
                setMessages((p) => [...p, { role: "model", parts: [{ text: `⚠️ ${e.message || "Something went wrong."}` }] }]);
            }
        } finally { setLoading(false); abortRef.current = null; }
    };
    const handleApproval = async (approvalId, decision) => {
        if (!approvalId || approvalBusy) return;
        setApprovalBusy(true);
        pausedRef.current = false;
        setPendingApproval(null);
        const gen = chatGenRef.current;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API}/agent/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ approvalId, decision }),
            });
            await consumeAgentStream(response, gen);
        } catch (e) {
            setMessages((p) => [...p, { role: "model", parts: [{ text: `⚠️ ${e.message || "Approval failed."}` }] }]);
        } finally { setApprovalBusy(false); setLoading(false); }
    };
    const handleStop = () => { abortRef.current?.abort(); };
    const accent = isAgent ? "#8b5cf6" : "var(--c-primary)";

    return (
        <div
            className={isAgent ? "agent-workspace" : "chat-shell"}
            style={{
                display: "flex",
                // Fullscreen: break out of SidebarLayout's content padding (32px top, 48px bottom, gutter sides)
                margin: "-32px calc(-1 * var(--content-gutter)) -48px calc(-1 * var(--content-gutter))",
                width: "calc(100% + var(--content-gutter) * 2)",
                height: "calc(100dvh - var(--topbar-h))",
                minHeight: 560,
                overflow: "hidden",
                position: "relative",
                borderTop: "1px solid var(--ag-border)",
                boxShadow: "var(--ag-shadow)",
            }}
        >
            <style>{AGENT_STYLES}</style>

            {/* Sidebar */}
            <div className="hidden lg:flex h-full flex-shrink-0" style={{ height: "100%" }}>
                <SessionSidebar sessions={sessions} currentSessionId={currentSessionId} onNew={clearChat} onLoad={loadSession} onDelete={deleteSession} accent={accent} />
            </div>
            {sidebarOpen && (
                <>
                    <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(3,5,17,0.48)", backdropFilter: "blur(6px)" }} />
                    <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 81, width: 320, boxShadow: "24px 0 64px rgba(0,0,0,0.32)", animation: "slideIn 0.26s var(--ease-out)" }}>
                        <SessionSidebar sessions={sessions} currentSessionId={currentSessionId} onNew={clearChat} onLoad={loadSession} onDelete={deleteSession} accent={accent} />
                    </div>
                </>
            )}

            {/* Main — Claude paper */}
            <main style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minWidth: 0, overflow: "hidden", background: "var(--ag-bg)" }}>
                <header style={{
                    height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px",
                    borderBottom: "1px solid var(--ag-border)", background: "var(--ag-bg)", flexShrink: 0, gap: 12,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{ background: "var(--ag-panel)", border: "1px solid var(--ag-border)", color: "var(--ag-text)", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0 }}>
                            <MenuIcon size={14} />
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <span style={{ width: 30, height: 30, borderRadius: 8, background: isAgent ? "#6D28D9" : "#D97706", display: "grid", placeItems: "center", color: "white", fontWeight: 800, fontSize: "0.72rem", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>{isAgent ? <Bot size={14} color="white" /> : <span>◐</span>}</span>
                            <div style={{ lineHeight: 1.1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontWeight: 700, fontSize: "0.92rem", letterSpacing: "-0.01em", color: "var(--ag-text)" }}>{isAgent ? "Claude — Agent" : "Claude"}</span>
                                    <span style={{ fontSize: "0.62rem", fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: "var(--ag-faint)", border: "1px solid var(--ag-border)", color: "var(--ag-muted)", fontFamily: "var(--font-mono)" }}>{isAgent ? "EduSmart • Live" : "EduSmart • Tutor"}</span>
                                </div>
                                <div style={{ display: "none", fontSize: "0.70rem", color: "var(--ag-muted)", fontWeight: 450 }} className="hidden sm:block">{isAgent ? "Acts only after your approval" : "Helpful, harmless, honest"}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "flex", gap: 2, background: "var(--ag-faint)", borderRadius: 999, padding: 3, border: "1px solid var(--ag-border)" }}>
                            {[
                                { id: "tutor", label: "Tutor" },
                                { id: "agent", label: "Agent" },
                            ].map(m => {
                                const active = mode === m.id;
                                return (
                                    <button key={m.id} onClick={() => { if (m.id !== mode) { setMode(m.id); clearChat(); } }} style={{
                                        padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer", fontWeight: 650, fontSize: "0.76rem",
                                        background: active ? "var(--ag-panel)" : "transparent",
                                        color: active ? "var(--ag-text)" : "var(--ag-muted)", display: "flex", alignItems: "center", gap: 5, transition: "all 0.14s",
                                        boxShadow: active ? "0 1px 4px rgba(0,0,0,0.06)" : "none", border: active ? "1px solid var(--ag-border)" : "1px solid transparent",
                                    }}>
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </header>

                <MessageList
                    mode={mode}
                    initialGreeting={initialGreeting}
                    messages={messages}
                    live={live}
                    streamingText={streamingText}
                    agentError={agentError}
                    chatContainerRef={chatContainerRef}
                    bottomRef={bottomRef}
                    onQuickAction={(t) => handleSend(t)}
                />

                {pendingApproval && (
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: 96, zIndex: 20, display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none" }}>
                        <div style={{ width: "100%", maxWidth: 680, pointerEvents: "auto" }}>
                            <ApprovalCard approval={pendingApproval} busy={approvalBusy} onDecide={handleApproval} />
                        </div>
                    </div>
                )}

                <ChatInput value={input} onChange={setInput} onSend={() => handleSend()} onStop={handleStop} disabled={!input.trim() || loading || approvalBusy} streaming={loading && isAgent} placeholder={isAgent ? "Tell me what to do — e.g. create a notice, add marks…" : "Ask anything — explain, quiz, plan…"} accent={accent} />
            </main>

            <style>{`
                @keyframes slideIn { from { transform: translateX(-12px); opacity:0; } to { transform: translateX(0); opacity:1; } }
            `}</style>
        </div>
    );
}
