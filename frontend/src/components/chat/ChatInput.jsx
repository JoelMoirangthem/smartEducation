import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square, Plus, Sparkles } from "lucide-react";

// Claude input — centered pill, paper, 760 max, no glass
export default function ChatInput({ value, onChange, onSend, onStop, disabled, streaming, placeholder, accent = "#D97706" }) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!value && ref.current) ref.current.style.height = "auto"; }, [value]);
  const onInput = (e) => {
    onChange(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0,
      padding: "16px 16px 14px",
      background: "linear-gradient(to top, var(--ag-bg) 68%, transparent)",
      pointerEvents: "none",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto", pointerEvents: "auto" }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 8, padding: "8px 10px 8px 12px",
          borderRadius: 24, background: "var(--ag-panel)", border: `1px solid ${focused ? "var(--ag-border-strong)" : "var(--ag-border)"}`,
          boxShadow: focused ? "0 4px 20px rgba(0,0,0,0.06)" : "0 2px 10px rgba(0,0,0,0.04)",
          transition: "all 0.14s",
        }}>
          <button type="button" title="Attach" style={{
            width: 32, height: 32, borderRadius: 999, border: "1px solid var(--ag-border)", background: "var(--ag-faint)",
            display: "grid", placeItems: "center", color: "var(--ag-muted)", cursor: "pointer", flexShrink: 0,
          }}>
            <Plus size={14} />
          </button>
          <textarea
            ref={ref}
            value={value}
            onChange={onInput}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "var(--ag-text)", padding: "9px 0", fontSize: "0.92rem", resize: "none",
              maxHeight: 140, fontFamily: "inherit", lineHeight: 1.55, fontWeight: 450, minHeight: 22,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, paddingBottom: 1 }}>
            <span style={{ display: "none", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--ag-muted)", border: "1px solid var(--ag-border)", padding: "4px 7px", borderRadius: 999, background: "var(--ag-faint)" }} className="hidden sm:inline-flex">
              <Sparkles size={10} /> {streaming ? "Generating" : "Claude"}
            </span>
            {streaming ? (
              <button onClick={onStop} title="Stop" style={{
                width: 36, height: 36, borderRadius: 999, border: "1px solid #FECACA",
                background: "#FEF2F2", color: "#DC2626", cursor: "pointer", display: "grid", placeItems: "center",
              }}><Square size={12} fill="currentColor" /></button>
            ) : (
              <button onClick={onSend} disabled={disabled} title="Send" style={{
                width: 36, height: 36, borderRadius: 999, border: "none",
                background: !disabled ? accent : "var(--ag-faint)",
                color: !disabled ? "white" : "var(--ag-muted)",
                cursor: !disabled ? "pointer" : "default", display: "grid", placeItems: "center",
                boxShadow: !disabled ? "0 2px 8px rgba(0,0,0,0.08)" : "none", transition: "all 0.14s", flexShrink: 0,
              }}>
                <ArrowUp size={16} strokeWidth={2.3} />
              </button>
            )}
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, color: "var(--ag-muted)", fontSize: "0.68rem", lineHeight: 1.4 }}>
          Claude can make mistakes. Please double-check responses. • <span style={{ textDecoration: "underline", cursor: "pointer" }}>EduSmart AI</span>
        </div>
      </div>
    </div>
  );
}
