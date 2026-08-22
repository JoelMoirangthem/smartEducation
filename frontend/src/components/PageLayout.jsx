/**
 * Shared page-level components used by all inner pages.
 * Clean, simple, practical — no flashy gradients or AI aesthetics.
 */

/* ─── Card ─────────────────────────────────────────────────── */
export const Card = ({ children, style = {}, accent, noPad, onMouseEnter, onMouseLeave, onClick }) => (
    <div style={{
        background: 'var(--c-card-bg)',
        border: `1px solid ${accent ? accent + '30' : 'var(--c-border)'}`,
        borderRadius: 16,
        padding: noPad ? 0 : '24px',
        transition: 'border-color 0.2s ease',
        ...style,
    }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick}>
        {children}
    </div>
);

/* ─── Section heading ───────────────────────────────────────── */
export const SectionTitle = ({ children, right }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>{children}</h2>
        {right && right}
    </div>
);

/* ─── Label ────────────────────────────────────────────────── */
export const Label = ({ children }) => (
    <label style={{
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--c-muted)',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    }}>
        {children}
    </label>
);

/* ─── Input / Select / Textarea ─────────────────────────────── */
const inputBase = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    background: 'var(--c-input-bg)', border: '1px solid var(--c-border)',
    color: 'var(--c-text)', fontSize: '0.9rem', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.2s ease', boxSizing: 'border-box',
};

const focusIn = (e, accent = 'var(--c-primary)') => {
    e.target.style.borderColor = accent + '80';
};
const focusOut = (e) => {
    e.target.style.borderColor = 'var(--c-border)';
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
        padding: '10px 20px', borderRadius: 10, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all 0.15s ease', width: full ? '100%' : undefined, fontFamily: 'inherit',
        ...(danger ? {
            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
        } : ghost ? {
            background: 'var(--c-surface)', color: 'var(--c-text)', border: '1px solid var(--c-border)',
        } : {
            background: disabled ? 'var(--c-muted)' : accent.startsWith('var') ? accent : accent,
            color: 'white',
        }),
        ...style,
    };
    return (
        <button type={type} onClick={onClick} disabled={disabled} style={base}
            onMouseEnter={e => {
                if (!disabled) {
                    e.currentTarget.style.opacity = '0.85';
                }
            }}
            onMouseLeave={e => {
                e.currentTarget.style.opacity = '';
            }}
        >{children}</button>
    );
};

/* ─── Badge / Pill ───────────────────────────────────────────── */
export const Badge = ({ children, color = 'var(--c-primary)' }) => (
    <span style={{
        padding: '3px 10px', borderRadius: 8, fontSize: '0.65rem',
        fontWeight: 700, textTransform: 'uppercase',
        background: color + '15', color,
    }}>{children}</span>
);

/* ─── Empty State ────────────────────────────────────────────── */
export const Empty = ({ icon: Icon, title, sub }) => (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        {Icon && <Icon size={36} color="var(--c-muted)" style={{ opacity: 0.4, marginBottom: 12 }} />}
        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4, color: 'var(--c-text)' }}>{title}</h3>
        {sub && <p style={{ fontSize: '0.85rem', color: 'var(--c-muted)' }}>{sub}</p>}
    </div>
);

/* ─── Page Header ────────────────────────────────────────────── */
export const PageHeader = ({ title, subtitle, accent = 'var(--c-primary)', icon: Icon, right }) => (
    <div style={{
        padding: '24px',
        borderRadius: 16,
        marginBottom: 24,
        background: 'var(--c-card-bg)',
        border: '1px solid var(--c-border)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
            {Icon && (
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: accent + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <Icon size={22} color={accent} />
                </div>
            )}
            <div style={{ minWidth: 0 }}>
                <h1 style={{
                    fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
                    fontWeight: 700,
                    color: 'var(--c-text)',
                    lineHeight: 1.2,
                    margin: 0,
                }}>{title}</h1>
                {subtitle && <p style={{ fontSize: '0.85rem', color: 'var(--c-muted)', marginTop: 2 }}>{subtitle}</p>}
            </div>
        </div>
        {right && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{right}</div>}
    </div>
);

/* ─── Spinner ─────────────────────────────────────────────────── */
export const Spinner = ({ label = 'Loading…' }) => (
    <div style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--c-muted)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--c-border)', borderTopColor: 'var(--c-primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '0.9rem' }}>{label}</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
);

export default Card;
