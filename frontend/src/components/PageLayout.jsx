/**
 * Shared page-level wrapper used by all inner pages.
 */

/* ─── Card ─────────────────────────────────────────────────── */
export const Card = ({ children, style = {}, accent, noPad, onMouseEnter, onMouseLeave, onClick }) => (
    <div style={{
        background: 'var(--c-card-bg)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${accent ? accent + '40' : 'var(--c-border)'}`,
        borderRadius: 28,
        padding: noPad ? 0 : '32px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 15px 45px rgba(0,0,0,0.05)',
        transition: 'all 0.4s cubic-bezier(0.2, 1, 0.3, 1)',
        ...style,
    }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick}>
        {children}
    </div>
);

/* ─── Section heading ───────────────────────────────────────── */
export const SectionTitle = ({ children, right }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-text)', letterSpacing: '-0.01em', margin: 0 }}>{children}</h2>
        {right && right}
    </div>
);

/* ─── Label ────────────────────────────────────────────────── */
export const Label = ({ children }) => (
    <label style={{
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: 800,
        color: 'var(--c-muted)',
        marginBottom: 8,
        letterSpacing: '0.08em',
        textTransform: 'uppercase'
    }}>
        {children}
    </label>
);

/* ─── Input / Select / Textarea ─────────────────────────────── */
const inputBase = {
    width: '100%', padding: '14px 18px', borderRadius: 14,
    background: 'var(--c-input-bg)', border: '1px solid var(--c-border)',
    color: 'var(--c-text)', fontSize: '1rem', outline: 'none',
    fontFamily: 'inherit', transition: 'all 0.25s ease', boxSizing: 'border-box',
    fontWeight: 500
};

const focusIn = (e, accent = 'var(--c-primary)') => {
    e.target.style.borderColor = accent + '80';
    e.target.style.boxShadow = `0 0 0 4px ${accent}15`;
};
const focusOut = (e) => {
    e.target.style.borderColor = 'var(--c-border)';
    e.target.style.boxShadow = 'none';
};

export const Input = ({ accent, style = {}, ...props }) => (
    <input {...props} style={{ ...inputBase, ...style }}
        onFocus={e => focusIn(e, accent)} onBlur={focusOut} />
);

export const Select = ({ accent, style = {}, children, ...props }) => (
    <select {...props} style={{ ...inputBase, ...style }}
        onFocus={e => focusIn(e, accent)} onBlur={focusOut}>
        {children}
    </select>
);

export const Textarea = ({ accent, rows = 4, style = {}, ...props }) => (
    <textarea rows={rows} {...props} style={{ ...inputBase, resize: 'none', ...style }}
        onFocus={e => focusIn(e, accent)} onBlur={focusOut} />
);

/* ─── Button ─────────────────────────────────────────────────── */
export const Btn = ({ children, accent = 'var(--c-primary)', ghost, danger, disabled, onClick, type = 'button', style = {}, full }) => {
    const base = {
        padding: '12px 28px', borderRadius: 16, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', width: full ? '100%' : undefined, fontFamily: 'inherit',
        ...(danger ? {
            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
        } : ghost ? {
            background: 'var(--c-surface)', color: 'var(--c-text)', border: '1px solid var(--c-border)',
        } : {
            background: disabled ? 'var(--c-muted)' : (accent.startsWith('var') ? accent : `linear-gradient(135deg,${accent},${accent}dd)`),
            color: 'white',
            boxShadow: disabled ? 'none' : (accent.startsWith('var') ? `0 8px 20px rgba(99,102,241,0.2)` : `0 8px 20px ${accent}40`),
        }),
        ...style,
    };
    return (
        <button type={type} onClick={onClick} disabled={disabled} style={base}
            onMouseEnter={e => {
                if (!disabled) {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    if (!ghost && !danger) e.currentTarget.style.boxShadow = accent.startsWith('var') ? `0 12px 30px rgba(99,102,241,0.3)` : `0 12px 30px ${accent}60`;
                    if (ghost) e.currentTarget.style.background = 'var(--c-surface-hover)';
                }
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                if (!disabled && !ghost && !danger) e.currentTarget.style.boxShadow = `0 8px 20px ${accent}40`;
                if (ghost) e.currentTarget.style.background = 'var(--c-surface)';
            }}
        >{children}</button>
    );
};

/* ─── Badge / Pill ───────────────────────────────────────────── */
export const Badge = ({ children, color = 'var(--c-primary)' }) => (
    <span style={{
        padding: '4px 14px', borderRadius: 12, fontSize: '0.65rem',
        fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
        background: color + '15', border: `1px solid ${color}30`, color,
        display: 'inline-flex', alignItems: 'center'
    }}>{children}</span>
);

/* ─── Empty State ────────────────────────────────────────────── */
export const Empty = ({ icon: Icon, title, sub }) => (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px'
        }}>
            {Icon && <Icon size={40} color="var(--c-muted)" style={{ opacity: 0.6 }} />}
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', marginBottom: 8, color: 'var(--c-text)' }}>{title}</h3>
        {sub && <p style={{ fontSize: '0.95rem', color: 'var(--c-muted)', fontWeight: 500 }}>{sub}</p>}
    </div>
);

/* ─── Page Header ────────────────────────────────────────────── */
export const PageHeader = ({ title, subtitle, accent = 'var(--c-primary)', icon: Icon, right }) => (
    <div style={{
        padding: '40px',
        borderRadius: 28,
        marginBottom: 32,
        background: accent.startsWith('var') ? `linear-gradient(135deg, rgba(99,102,241,0.1) 0%, var(--c-surface) 100%)` : `linear-gradient(135deg, ${accent}15 0%, var(--c-surface) 100%)`,
        border: `1px solid var(--c-border)`,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
        backdropFilter: 'blur(10px)'
    }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, minWidth: 0, flex: 1 }}>
                {Icon && (
                    <div style={{
                        width: 60,
                        height: 60,
                        borderRadius: 20,
                        background: accent.startsWith('var') ? `rgba(99,102,241,0.1)` : accent + '15',
                        border: accent.startsWith('var') ? `1px solid rgba(99,102,241,0.2)` : `1px solid ${accent}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: accent.startsWith('var') ? `0 8px 20px rgba(99,102,241,0.1)` : `0 8px 20px ${accent}22`
                    }}>
                        <Icon size={28} color={accent} />
                    </div>
                )}
                <div style={{ minWidth: 0 }}>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(1.5rem, 6vw, 2rem)',
                        fontWeight: 800,
                        color: 'var(--c-text)',
                        lineHeight: 1.1,
                        marginBottom: 6,
                        letterSpacing: '-0.02em'
                    }}>{title}</h1>
                    {subtitle && <p style={{ fontSize: '1rem', color: 'var(--c-muted)', fontWeight: 500, lineHeight: 1.4 }}>{subtitle}</p>}
                </div>
            </div>
            {right && <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>{right}</div>}
        </div>
    </div>
);

/* ─── Spinner ─────────────────────────────────────────────────── */
export const Spinner = ({ label = 'Synchronizing…' }) => (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, color: 'var(--c-muted)' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid var(--c-border)', borderTopColor: 'var(--c-primary)', animation: 'spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />
        <p style={{ fontSize: '1rem', fontWeight: 600 }}>{label}</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
);

export default Card;
