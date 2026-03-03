import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
            aria-label="Toggle theme"
            style={{
                position: 'relative',
                width: 52,
                height: 28,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                background: isDark
                    ? 'rgba(99,102,241,0.25)'
                    : 'rgba(250,204,21,0.3)',
                boxShadow: isDark
                    ? 'inset 0 0 0 1px rgba(99,102,241,0.4)'
                    : 'inset 0 0 0 1px rgba(234,179,8,0.5)',
                transition: 'background 0.35s ease, box-shadow 0.35s ease',
                flexShrink: 0,
                overflow: 'hidden',
            }}
        >
            {/* Sliding thumb */}
            <span style={{
                position: 'absolute',
                top: 3,
                left: isDark ? 3 : 25,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: isDark
                    ? 'linear-gradient(135deg,#818cf8,#6366f1)'
                    : 'linear-gradient(135deg,#fde047,#f59e0b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'left 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.35s ease',
                boxShadow: isDark
                    ? '0 2px 8px rgba(99,102,241,0.5)'
                    : '0 2px 8px rgba(234,179,8,0.6)',
            }}>
                {isDark
                    ? <Moon size={12} color="white" />
                    : <Sun size={12} color="white" />
                }
            </span>
        </button>
    );
}
