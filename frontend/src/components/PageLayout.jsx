/**
 * PageLayout — Spacious Premium Edition
 * Full-screen, glassy, airy. Every section breathes.
 */

/* ─── Card ─────────────────────────────────────────────────── */
export const Card = ({ children, style = {}, accent, noPad, onMouseEnter, onMouseLeave, onClick, hover }) => (
    <div
        className="glass-card"
        style={{
            background: 'var(--c-card-bg)',
            backdropFilter: 'blur(18px) saturate(1.12)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.12)',
            border: `1px solid ${accent ? accent + '22' : 'var(--c-border)'}`,
            borderRadius: 'var(--r-xl)',
            padding: noPad ? 0 : '28px',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.24s var(--ease-out)',
            ...style,
        }}
        onMouseEnter={e => {
            if (hover || accent) {
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.borderColor = accent ? accent + '30' : 'var(--c-border-strong)';
                e.currentTarget.style.transform = 'translateY(-1px)';
            }
            onMouseEnter?.(e);
        }}
        onMouseLeave={e => {
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.borderColor = accent ? accent + '22' : 'var(--c-border)';
            e.currentTarget.style.transform = 'translateY(0)';
            onMouseLeave?.(e);
        }}
        onClick={onClick}
    >
        {children}
    </div>
);

/* ─── Section heading ───────────────────────────────────────── */
export const SectionTitle = ({ children, right, hint }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 16 }}>
        <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--c-text)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{children}</h2>
            {hint && <p style={{ fontSize: '0.78rem', color: 'var(--c-muted)', marginTop: 4, fontWeight: 500 }}>{hint}</p>}
        </div>
        {right && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>}
    </div>
);

/* ─── Label ────────────────────────────────────────────────── */
export const Label = ({ children, optional }) => (
    <label style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: '0.72rem',
        fontWeight: 700,
        color: 'var(--c-muted)',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: '0.09em',
        lineHeight: 1,
    }}>
        {children}
        {optional && <span style={{ textTransform: 'none', fontWeight: 500, letterSpacing: '0', opacity: 0.6, fontSize: '0.7rem' }}>(optional)</span>}
    </label>
);

/* ─── Input / Select / Textarea ─────────────────────────────── */
const inputBase = {
    width: '100%', padding: '13px 16px', borderRadius: 12,
    background: 'var(--c-input-bg)', border: '1px solid var(--c-input-border)',
    color: 'var(--c-text)', fontSize: '0.92rem', outline: 'none',
    fontFamily: 'inherit', transition: 'all 0.18s var(--ease-out)', boxSizing: 'border-box',
    lineHeight: 1.4,
};

const focusIn = (e, accent = 'var(--c-primary)') => {
    e.target.style.borderColor = accent + '55';
    e.target.style.boxShadow = `0 0 0 4px ${accent}18, 0 2px 12px rgba(0,0,0,0.06)`;
    e.target.style.background = 'var(--c-surface-active)';
};
const focusOut = (e) => {
    e.target.style.borderColor = 'var(--c-input-border)';
    e.target.style.boxShadow = 'none';
    e.target.style.background = 'var(--c-input-bg)';
};

export const Input = ({ accent, style = {}, ...props }) => (
    <input {...props} style={{ ...inputBase, ...style }}
        onFocus={e => focusIn(e, accent)} onBlur={focusOut} />
);

export const Select = ({ accent, style = {}, children, ...props }) => (
    <select {...props} style={{ ...inputBase, ...style, cursor: 'pointer' }}
        onFocus={e => focusIn(e, accent)} onBlur={focusOut}>
        {children}
    </select>
);

export const Textarea = ({ accent, rows = 4, style = {}, ...props }) => (
    <textarea rows={rows} {...props} style={{ ...inputBase, resize: 'vertical', minHeight: 96, ...style }}
        onFocus={e => focusIn(e, accent)} onBlur={focusOut} />
);

/* ─── Button ─────────────────────────────────────────────────── */
export const Btn = ({ children, accent = 'var(--c-primary)', ghost, danger, disabled, onClick, type = 'button', style = {}, full, size }) => {
    const h = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
    const base = {
        padding: size === 'sm' ? '0 14px' : '0 20px',
        height: h,
        borderRadius: 12,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700,
        fontSize: size === 'sm' ? '0.8rem' : '0.88rem',
        letterSpacing: '-0.01em',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all 0.18s var(--ease-out)',
        width: full ? '100%' : undefined,
        fontFamily: 'inherit',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.55 : 1,
        boxShadow: ghost || danger ? 'none' : '0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.1)',
        ...(danger ? {
            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.18)', boxShadow: 'none',
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
                if (disabled) return;
                if (ghost) { e.currentTarget.style.background = 'var(--c-surface-hover)'; e.currentTarget.style.borderColor = 'var(--c-border-strong)'; }
                else if (!danger) { e.currentTarget.style.filter = 'brightness(1.06)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.14)'; }
                else { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; }
            }}
            onMouseLeave={e => {
                e.currentTarget.style.filter = '';
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = base.boxShadow;
                if (ghost) { e.currentTarget.style.background = 'var(--c-surface)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }
                if (danger) e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
            }}
        >{children}</button>
    );
};

/* ─── Badge / Pill ───────────────────────────────────────────── */
export const Badge = ({ children, color = 'var(--c-primary)', subtle, size }) => (
    <span style={{
        padding: size === 'sm' ? '3px 8px' : '5px 10px', borderRadius: 999, fontSize: size === 'sm' ? '0.62rem' : '0.68rem',
        fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1,
        background: subtle ? 'var(--c-surface)' : color + '14', color: subtle ? 'var(--c-muted)' : color,
        border: `1px solid ${subtle ? 'var(--c-border)' : color + '18'}`,
        display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
    }}>{children}</span>
);

/* ─── Empty State ────────────────────────────────────────────── */
export const Empty = ({ icon: Icon, title, sub, action }) => (
    <div style={{ padding: '56px 28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {Icon && (
            <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                display: 'grid', placeItems: 'center', marginBottom: 4,
                color: 'var(--c-muted)', opacity: 0.9
            }}>
                <Icon size={26} />
            </div>
        )}
        <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--c-text)', letterSpacing: '-0.02em', margin: 0 }}>{title}</h3>
        {sub && <p style={{ fontSize: '0.88rem', color: 'var(--c-muted)', maxWidth: 420, lineHeight: 1.6, margin: 0 }}>{sub}</p>}
        {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
);

/* ─── Page Header — spacious hero ────────────────────────────── */
export const PageHeader = ({ title, subtitle, accent = 'var(--c-primary)', icon: Icon, right }) => (
    <div
        className="glass-card"
        style={{
            padding: '28px 32px',
            borderRadius: 'var(--r-2xl)',
            marginBottom: 28,
            background: `linear-gradient(135deg, ${accent}0d, ${accent}06 45%, var(--c-card-bg) 85%), var(--c-card-bg)`,
            border: '1px solid var(--c-border)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
            backdropFilter: 'blur(18px) saturate(1.12)',
        }}>
        {/* subtle grid accent */}
        <div style={{
            position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
            backgroundImage: `linear-gradient(var(--c-border) 1px, transparent 1px), linear-gradient(90deg, var(--c-border) 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
        }} />
        <div style={{ position: 'absolute', top: -40, right: -30, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(closest-side, ${accent}18, transparent)`, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0, flex: 1, position: 'relative' }}>
            {Icon && (
                <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: `${accent}14`,
                    border: `1px solid ${accent}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: `0 8px 20px ${accent}14`,
                }}>
                    <Icon size={24} color={accent} strokeWidth={1.8} />
                </div>
            )}
            <div style={{ minWidth: 0 }}>
                <h1 style={{
                    fontSize: 'clamp(1.35rem, 2.2vw, 1.75rem)',
                    fontWeight: 850,
                    color: 'var(--c-text)',
                    lineHeight: 1.15,
                    margin: 0,
                    letterSpacing: '-0.035em',
                    fontFamily: 'var(--font-display)',
                }}>{title}</h1>
                {subtitle && <p style={{ fontSize: '0.92rem', color: 'var(--c-muted)', marginTop: 6, lineHeight: 1.5, fontWeight: 500, maxWidth: 720 }}>{subtitle}</p>}
            </div>
        </div>
        {right && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>{right}</div>}
    </div>
);

/* ─── Spinner ─────────────────────────────────────────────────── */
export const Spinner = ({ label = 'Loading…' }) => (
    <div style={{ minHeight: '48vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--c-muted)' }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid var(--c-border)', borderTopColor: 'var(--c-primary)', animation: 'spin 0.85s linear infinite' }} />
        <p style={{ fontSize: '0.92rem', fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
);

export default Card;
