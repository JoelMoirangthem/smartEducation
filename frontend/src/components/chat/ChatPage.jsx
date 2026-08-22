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
    // ─── State ───
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
    const [live, setLive] = useState(null); // { intent, steps, thinking }

    // ─── Refs ───
    // Authoritative accumulated answer text for the in-flight turn. The
    // typewriter only drives the visual `streamingText`; the finalized
    // message always comes from here, so batching delays can never truncate it.
    const fullAnswerRef = useRef("");
    // Agent activity trail, mutated synchronously by the stream consumer;
    // lives on a ref so it survives the chat -> approve -> resume round-trip.
    const trailRef = useRef(emptyTrail());
    // Mirror of streamingText so stream reconciliation can diff against what
    // is actually rendered without waiting for a re-render.
    const streamedTextRef = useRef("");
    const abortRef = useRef(null);
    // True while the agent turn is paused on an approval popup. The approval
    // stream ENDS (server suspends the turn), so finalizeTurn must not treat
    // it as a completed answer or clear the popup it just rendered.
    const pausedRef = useRef(false);
    // Bumped on New-chat / session-load / mode switch. Streams captured with an
    // older generation are stale: their events (especially `session`, which
    // would graft the OLD conversation's id onto the new one) are discarded.
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

    // ─── Typewriter engine (visual only) ───
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

    /** Stop the typewriter and fold any queued chars into the visual stream. */
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

    /** Replace the visual stream with authoritative text, re-typing only the
     * suffix that wasn't already streamed via token events. */
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
        chatGenRef.current++; // stale in-flight streams must not touch this session
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
        chatGenRef.current++; // invalidate in-flight streams: no old session id / tail events
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

    /**
     * Finalize the current turn: flush the typewriter, append the model
     * message (with activity meta) built from the authoritative refs.
     * When the turn paused on an approval, keep the popup and the live
     * timeline — the turn resumes after Approve/Reject.
     */
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

    // ─── Agent SSE consumer ───
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
                    case "agent_start":
                        snapshotLive(true);
                        break;
                    case "agent_done":
                        snapshotLive(false);
                        break;
                    case "tool_start":
                        trailRef.current.steps.push({
                            name: evt.tool,
                            label: evt.label || evt.tool,
                            status: "running",
                            startedAt: Date.now(),
                            detail: "",
                        });
                        snapshotLive(true);
                        break;
                    case "tool_result": {
                        const steps = trailRef.current.steps;
                        let idx = -1;
                        for (let i = steps.length - 1; i >= 0; i--) {
                            if (steps[i].name === evt.tool && steps[i].status === "running") { idx = i; break; }
                        }
                        if (idx !== -1) {
                            steps[idx] = {
                                ...steps[idx],
                                status: evt.rejected ? "rejected" : (evt.ok ? "ok" : (evt.status === "denied" ? "denied" : "error")),
                                detail: evt.summary || "",
                                duration: Date.now() - (steps[idx].startedAt || Date.now()),
                            };
                        }
                        snapshotLive(false);
                        break;
                    }
                    case "approval":
                        pausedRef.current = true;
                        setPendingApproval({
                            approvalId: evt.approvalId,
                            tool: evt.tool,
                            label: evt.label,
                            severity: evt.severity,
                            preview: evt.preview,
                            args: evt.args,
                        });
                        snapshotLive(false);
                        break;
                    case "token":
                        // Live LLM output — append to the visible buffer; the
                        // final `answer` event reconciles it with the full text.
                        fullAnswerRef.current += evt.text || "";
                        queueText(evt.text || "");
                        break;
                    case "answer":
                        if (evt.meta && !serverMeta) serverMeta = evt.meta;
                        reconcileStream(evt.text || "");
                        break;
                    case "session":
                        if (gen === chatGenRef.current) setCurrentSessionId(evt.id);
                        break;
                    case "error":
                        fullAnswerRef.current += `\n⚠️ ${evt.message}`;
                        queueText(`\n⚠️ ${evt.message}`);
                        setAgentError(evt.message);
                        break;
                    default:
                        break;
                }
            }
        }

        if (gen === chatGenRef.current) finalizeTurn(serverMeta);
    };

    // ─── Turns ───
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
                if (parts[0]) {
                    fullAnswerRef.current += parts[0];
                    queueText(parts[0]);
                }
                const id = parts[1]?.replace("]", "");
                if (id && !currentSessionId && gen === chatGenRef.current) { setCurrentSessionId(id); fetchSessions(); }
            } else {
                fullAnswerRef.current += chunk;
                queueText(chunk);
            }
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

        const history = messages.map((m) => ({
            role: m.role === "model" ? "model" : "user",
            content: m.parts?.[0]?.text || "",
        })).filter((m) => m.content);

        const controller = new AbortController();
        abortRef.current = controller;
        const gen = chatGenRef.current;

        try {
            if (isAgent) {
                await runAgentTurn({ message: text, history }, controller.signal, gen);
            } else {
                await runTutorTurn({ text, history }, controller.signal, gen);
            }
        } catch (e) {
            if (e.name === "AbortError") {
                finalizeTurn(null); // keep whatever streamed before the stop
            } else {
                setLive(null);
                setStreamingText("");
                streamedTextRef.current = "";
                fullAnswerRef.current = "";
                setMessages((p) => [...p, { role: "model", parts: [{ text: `⚠️ ${e.message || "Something went wrong."}` }] }]);
            }
        } finally {
            setLoading(false);
            abortRef.current = null;
        }
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
        } finally {
            setApprovalBusy(false);
            setLoading(false);
        }
    };

    const handleStop = () => {
        abortRef.current?.abort();
    };

    const accent = isAgent ? "#8b5cf6" : "var(--c-primary)";

    return (
        <div className={isAgent ? "agent-workspace" : "chat-shell"} style={{
            display: "flex", height: "calc(100vh - 120px)", margin: "0",
            overflow: "hidden", position: "relative",
            borderRadius: 24, border: "1px solid var(--c-border)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.1)",
        }}>
            <style>{AGENT_STYLES}</style>

            {/* Desktop sidebar */}
            <div className="hidden lg:block h-full flex-shrink-0">
                <SessionSidebar
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    onNew={clearChat}
                    onLoad={loadSession}
                    onDelete={deleteSession}
                    accent={accent}
                />
            </div>

            {/* Mobile sidebar */}
            {sidebarOpen && (
                <>
                    <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)" }} />
                    <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 101, animation: "slideIn 0.3s ease-out" }}>
                        <SessionSidebar
                            sessions={sessions}
                            currentSessionId={currentSessionId}
                            onNew={clearChat}
                            onLoad={loadSession}
                            onDelete={deleteSession}
                            accent={accent}
                        />
                    </div>
                </>
            )}

            {/* Main area */}
            <main style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minWidth: 0 }}>
                <header className={isAgent ? "ag-glass" : ""} style={{
                    height: 60, display: "flex", alignItems: "center", padding: "0 20px",
                    justifyContent: "space-between", borderBottom: "1px solid var(--c-border)",
                    flexShrink: 0,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{
                            background: "var(--c-surface-hover)", border: "1px solid var(--c-border)",
                            color: "var(--c-text)", cursor: "pointer", padding: 7, borderRadius: 9,
                        }}><MenuIcon size={18} /></button>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {isAgent ? <Bot size={16} color="#8b5cf6" /> : <Sparkles size={16} color="var(--c-primary)" />}
                            <span style={{ fontWeight: 800, fontSize: "1rem" }}>
                                {isAgent ? "EduSmart Agent" : "EduSmart AI"}
                            </span>
                            {isAgent && (
                                <span style={{
                                    fontSize: "0.65rem", fontWeight: 800, padding: "2px 8px", borderRadius: 8,
                                    background: "rgba(139,92,246,0.12)", color: "#a78bfa",
                                    border: "1px solid rgba(139,92,246,0.3)", letterSpacing: "0.05em",
                                    animation: "ag-pulse 2.4s ease-in-out infinite",
                                }}>LIVE</span>
                            )}
                        </div>

                        <div style={{
                            display: "flex", gap: 3, background: "var(--c-surface-hover)", borderRadius: 10,
                            padding: 3, border: "1px solid var(--c-border)", marginLeft: 8,
                        }}>
                            {["tutor", "agent"].map((m) => (
                                <button key={m} onClick={() => { if (m !== mode) { setMode(m); clearChat(); } }}
                                    style={{
                                        padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                                        fontWeight: 700, fontSize: "0.78rem",
                                        background: mode === m ? (m === "agent" ? "linear-gradient(135deg, #8b5cf6, #22d3ee)" : "var(--c-primary)") : "transparent",
                                        color: mode === m ? "white" : "var(--c-muted)",
                                        transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5,
                                    }}>
                                    {m === "agent" ? <Bot size={13} /> : <MessageSquare size={13} />}
                                    {m === "agent" ? "Agent" : "Tutor"}
                                </button>
                            ))}
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

                {/* Coding-agent-style permission popup, pinned above the input.
                    The turn is paused until Approve/Reject is clicked. */}
                {pendingApproval && (
                    <div style={{
                        position: "absolute", left: 0, right: 0, bottom: 108, zIndex: 30,
                        display: "flex", justifyContent: "center", padding: "0 20px",
                        pointerEvents: "none",
                    }}>
                        <div style={{ width: "100%", maxWidth: 660, pointerEvents: "auto" }}>
                            <ApprovalCard approval={pendingApproval} busy={approvalBusy} onDecide={handleApproval} />
                        </div>
                    </div>
                )}

                <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={() => handleSend()}
                    onStop={handleStop}
                    disabled={!input.trim() || loading || approvalBusy}
                    streaming={loading && isAgent}
                    placeholder={isAgent ? "Tell me what to do — e.g. create a notice, add marks…" : "Ask me anything…"}
                    accent={accent}
                />
            </main>

            <style>{`
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(155,155,155,0.15); border-radius: 8px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(155,155,255,0.3); }
            `}</style>
        </div>
    );
}
