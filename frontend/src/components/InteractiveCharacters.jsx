import React, { useState, useEffect, useRef } from 'react';

const Character = ({ style, children, eyesPos = [] }) => {
    const [eyeStyle, setEyeStyle] = useState({ x: 0, y: 0 });
    const [headStyle, setHeadStyle] = useState({ x: 0, y: 0 });
    const ref = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;
            const angle = Math.atan2(dy, dx);

            // Eyes move faster and less
            const eDist = Math.min(Math.sqrt(dx * dx + dy * dy) / 15, 5);
            // Head/Body moves slower and more perceptibly
            const hDist = Math.min(Math.sqrt(dx * dx + dy * dy) / 25, 10);

            setEyeStyle({
                x: Math.cos(angle) * eDist,
                y: Math.sin(angle) * eDist
            });
            setHeadStyle({
                x: Math.cos(angle) * hDist,
                y: Math.sin(angle) * hDist
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div ref={ref} style={{
            position: 'absolute',
            ...style,
            transform: `translate(${headStyle.x}px, ${headStyle.y}px)`,
            transition: 'transform 0.1s cubic-bezier(0.2, 0, 0.2, 1)'
        }}>
            {children}
            {eyesPos.map((pos, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    width: 7,
                    height: 7,
                    background: 'white',
                    borderRadius: '50%',
                    top: pos.top,
                    left: pos.left,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '0.5px solid rgba(0,0,0,0.1)'
                }}>
                    <div style={{
                        width: 3,
                        height: 3,
                        background: 'black',
                        borderRadius: '50%',
                        transform: `translate(${eyeStyle.x}px, ${eyeStyle.y}px)`
                    }} />
                </div>
            ))}
        </div>
    );
};

export default function InteractiveCharacters() {
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            background: '#e5e7eb', // Light grey side
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            overflow: 'hidden',
            paddingBottom: '40px'
        }}>
            <div style={{ position: 'relative', width: 240, height: 300 }}>
                {/* Purple Character */}
                <Character
                    style={{
                        width: 70, height: 160,
                        background: '#7c3aed',
                        bottom: 40, left: 40,
                        zIndex: 1,
                        borderRadius: '4px'
                    }}
                    eyesPos={[{ top: 20, left: 25 }, { top: 20, left: 45 }]}
                />

                {/* Orange Character (Bottom Left) */}
                <Character
                    style={{
                        width: 110, height: 55,
                        background: '#f97316',
                        bottom: 0, left: 0,
                        zIndex: 2,
                        borderRadius: '60px 60px 0 0'
                    }}
                />

                {/* Black Character */}
                <Character
                    style={{
                        width: 50, height: 100,
                        background: '#111827',
                        bottom: 30, left: 95,
                        zIndex: 1,
                        borderRadius: '4px'
                    }}
                    eyesPos={[{ top: 15, left: 15 }, { top: 15, left: 35 }]}
                />

                {/* Yellow Character */}
                <Character
                    style={{
                        width: 80, height: 70,
                        background: '#fbbf24',
                        bottom: 0, left: 130,
                        zIndex: 2,
                        borderRadius: '40px 10px 0 0'
                    }}
                    eyesPos={[{ top: 20, left: 30 }]}
                >
                    {/* Beak */}
                    <div style={{
                        position: 'absolute',
                        width: 30, height: 4,
                        background: '#111827',
                        top: 35, left: 55
                    }} />
                </Character>
            </div>

            {/* Subtle floating aura/shadow in the background if desired */}
            <div style={{
                position: 'absolute',
                top: '20%', left: '10%',
                width: 300, height: 300,
                background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)',
                filter: 'blur(40px)',
                zIndex: 0
            }} />
        </div>
    );
}
