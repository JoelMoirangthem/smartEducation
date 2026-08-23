import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const lang = (className || "").replace("language-", "") || "text";
  const text = String(children).replace(/\n$/, "");
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {}
  };
  // inline
  if (!className) {
    return <code style={{ background: "var(--ag-faint)", border: "1px solid var(--ag-border)", borderRadius: 5, padding: "1px 5px", fontSize: "0.86em", fontFamily: "'JetBrains Mono', monospace", color: "var(--ag-text)", wordBreak: "break-word" }}>{children}</code>;
  }
  return (
    <div className="claude-code" style={{ margin: "14px 0" }}>
      <div className="claude-code-head">
        <span style={{ textTransform: "lowercase", letterSpacing: "0.02em" }}>{lang}</span>
        <button onClick={onCopy} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 7, border: "1px solid var(--ag-code-border)", background: "rgba(255,255,255,0.06)", color: "#9A9A9A", cursor: "pointer", fontSize: "0.70rem", fontWeight: 600 }}>
          {copied ? <Check size={12} color="#22c55e" /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "14px 16px", overflowX: "auto", background: "transparent" }}>
        <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.84rem", lineHeight: 1.6, color: "#E8E8E8", whiteSpace: "pre" }}>{children}</code>
      </pre>
    </div>
  );
}

const mdComponents = {
  p: ({ children }) => <p style={{ margin: "0 0 12px", lineHeight: 1.7, fontSize: "0.95rem", color: "var(--ag-text)", letterSpacing: "-0.01em" }}>{children}</p>,
  ul: ({ children }) => <ul style={{ listStyleType: "disc", paddingLeft: "1.4rem", margin: "0 0 12px", fontSize: "0.94rem", color: "var(--ag-text)", lineHeight: 1.65 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ listStyleType: "decimal", paddingLeft: "1.4rem", margin: "0 0 12px", fontSize: "0.94rem", color: "var(--ag-text)", lineHeight: 1.65 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 4, paddingLeft: 4 }}>{children}</li>,
  h1: ({ children }) => <h1 style={{ fontWeight: 750, fontSize: "1.55rem", letterSpacing: "-0.02em", margin: "22px 0 10px", color: "var(--ag-text)", lineHeight: 1.2 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.02em", margin: "20px 0 8px", color: "var(--ag-text)", lineHeight: 1.25, borderBottom: "1px solid var(--ag-border)", paddingBottom: 8 }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.01em", margin: "18px 0 8px", color: "var(--ag-text)" }}>{children}</h3>,
  hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--ag-border)", margin: "20px 0" }} />,
  strong: ({ children }) => <strong style={{ fontWeight: 700, color: "var(--ag-text)" }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: "italic", color: "var(--ag-text)" }}>{children}</em>,
  blockquote: ({ children }) => <blockquote style={{ borderLeft: "3px solid var(--ag-border-strong)", paddingLeft: 16, margin: "14px 0", color: "var(--ag-muted)", fontStyle: "italic", background: "var(--ag-faint)", borderRadius: "0 8px 8px 0", paddingTop: 8, paddingBottom: 8 }}>{children}</blockquote>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--ag-accent)", textDecoration: "underline", textUnderlineOffset: 3, fontWeight: 500 }}>{children}</a>,
  code: ({ children, className }) => <CodeBlock className={className}>{children}</CodeBlock>,
  table: ({ children }) => <div style={{ overflowX: "auto", margin: "14px 0", border: "1px solid var(--ag-border)", borderRadius: 10 }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>{children}</table></div>,
  th: ({ children }) => <th style={{ textAlign: "left", padding: "10px 12px", background: "var(--ag-faint)", borderBottom: "1px solid var(--ag-border)", fontWeight: 700, color: "var(--ag-text)", fontSize: "0.78rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>{children}</th>,
  td: ({ children }) => <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--ag-border)", color: "var(--ag-text)" }}>{children}</td>,
};

export default function Markdown({ children }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {children}
    </ReactMarkdown>
  );
}
