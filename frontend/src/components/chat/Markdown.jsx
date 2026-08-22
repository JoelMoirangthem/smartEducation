import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const mdComponents = {
    p: ({ children }) => <p style={{ marginBottom: "1rem", lineHeight: 1.7, fontSize: "clamp(0.92rem, 2vw, 1.02rem)" }}>{children}</p>,
    ul: ({ children }) => <ul style={{ listStyleType: "disc", paddingLeft: "1.25rem", marginBottom: "1rem", fontSize: "clamp(0.92rem, 2vw, 0.98rem)" }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ listStyleType: "decimal", paddingLeft: "1.25rem", marginBottom: "1rem", fontSize: "clamp(0.92rem, 2vw, 0.98rem)" }}>{children}</ol>,
    li: ({ children }) => <li style={{ marginBottom: "0.4rem", paddingLeft: "0.25rem" }}>{children}</li>,
    h2: ({ children }) => <h2 style={{ fontWeight: 700, fontSize: "clamp(1.05rem, 3vw, 1.35rem)", marginBottom: "0.7rem", marginTop: "1rem" }}>{children}</h2>,
    h3: ({ children }) => <h3 style={{ fontWeight: 700, fontSize: "clamp(0.95rem, 2.5vw, 1.15rem)", marginBottom: "0.6rem", marginTop: "0.9rem" }}>{children}</h3>,
    hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--c-border)", margin: "1.5rem 0" }} />,
    strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
    em: ({ children }) => <em style={{ fontStyle: "italic", opacity: 0.85 }}>{children}</em>,
    blockquote: ({ children }) => <blockquote style={{ borderLeft: "3px solid var(--c-primary)", paddingLeft: "1rem", fontStyle: "italic", marginBottom: "1rem" }}>{children}</blockquote>,
    code: ({ children, inline }) => inline
        ? <code style={{ background: "rgba(139,92,246,0.12)", borderRadius: 4, padding: "2px 5px", fontSize: "0.85em", fontFamily: "'Fira Code', monospace", color: "var(--c-primary)" }}>{children}</code>
        : <div style={{ background: "#0d0d14", borderRadius: 10, padding: "1rem", overflowX: "auto", marginBottom: "1rem", border: "1px solid rgba(255,255,255,0.1)" }}>
            <code style={{ fontFamily: "'Fira Code', monospace", fontSize: "min(0.82rem, 3.5vw)", color: "#e2e8f0", lineHeight: 1.5 }}>{children}</code>
        </div>,
};

export default function Markdown({ children }) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {children}
        </ReactMarkdown>
    );
}
