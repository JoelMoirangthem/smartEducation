import { useEffect, useRef } from "react";
import { ArrowUp, Loader2, Square } from "lucide-react";

/** Auto-growing input with send / stop control. */
export default function ChatInput({ value, onChange, onSend, onStop, disabled, streaming, placeholder, accent = "var(--c-primary)" }) {
    const textareaRef = useRef(null);

    // Reset height when the value is cleared externally (after send).
    useEffect(() => {
        if (!value && textareaRef.current) textareaRef.current.style.height = "auto";
    }, [value]);

    const handleChange = (e) => {
        onChange(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "24px 20px", background: "linear-gradient(transparent, var(--c-bg) 50%)",
            pointerEvents: "none",
        }}>
            <div className="ag-glass" style={{
                maxWidth: 720, margin: "0 auto", borderRadius: 20, padding: "8px 12px",
                display: "flex", alignItems: "flex-end", gap: 8,
                boxShadow: "0 20px 50px rgba(0,0,0,0.15)", pointerEvents: "auto",
            }}>
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    rows={1}
                    style={{
                        flex: 1, background: "transparent", border: "none", outline: "none",
                        color: "var(--c-text)", padding: "10px 6px", fontSize: "0.95rem",
                        resize: "none", maxHeight: 160, fontFamily: "inherit", lineHeight: "1.5", fontWeight: 500,
                    }}
                />
                {streaming ? (
                    <button onClick={onStop} title="Stop generating" style={{
                        width: 40, height: 40, borderRadius: 12, border: "none",
                        background: "#ef444422", color: "#ef4444", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                        <Square size={15} fill="currentColor" />
                    </button>
                ) : (
                    <button onClick={onSend} disabled={disabled} style={{
                        width: 40, height: 40, borderRadius: 12, border: "none",
                        background: !disabled ? accent : "var(--c-surface-hover)",
                        color: !disabled ? "white" : "var(--c-muted)",
                        cursor: !disabled ? "pointer" : "default",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s", flexShrink: 0,
                    }}>
                        {disabled && value.trim() ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={20} />}
                    </button>
                )}
            </div>
        </div>
    );
}
