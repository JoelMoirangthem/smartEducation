import React, { Suspense, useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import { Loader2 } from 'lucide-react';

/**
 * InteractiveNexBot - Renders a 3D Spline scene with cursor interaction.
 * The scene is loaded from /scene.splinecode (Public folder).
 */
export default function InteractiveNexBot({ hoveredRole }) {
    const containerRef = useRef(null);
    const splineRef = useRef(null);

    // Initial load handler to store spline instance
    const onLoad = (splineApp) => {
        splineRef.current = splineApp;
    };

    // React to hover changes by triggering Spline internal events/states
    useEffect(() => {
        if (splineRef.current) {
            try {
                if (hoveredRole) {
                    // Try multiple common trigger names to ensure 'holding' state is reached
                    const roleId = hoveredRole.toLowerCase();
                    splineRef.current.emitEvent('mouseover', roleId);
                    splineRef.current.emitEvent('hover', roleId);
                    splineRef.current.emitEvent('active', roleId);
                    splineRef.current.emitEvent('mouseover', 'Card'); // Generic trigger

                    splineRef.current.setVariable('role', roleId);
                    splineRef.current.setVariable('isHovered', true);
                    splineRef.current.setVariable('is_hovering', 1);
                } else {
                    splineRef.current.emitEvent('mouseout', 'all');
                    splineRef.current.setVariable('isHovered', false);
                    splineRef.current.setVariable('is_hovering', 0);
                    splineRef.current.setVariable('role', 'none');
                }
            } catch (e) {
                console.log("Spline interaction error:", e);
            }
        }
    }, [hoveredRole]);

    useEffect(() => {
        let lastX = 0;
        let lastY = 0;

        const handleGlobalMouseMove = (e) => {
            const canvas = containerRef.current?.querySelector('canvas');
            if (canvas) {
                const event = new MouseEvent('mousemove', {
                    clientX: e.clientX,
                    clientY: e.clientY,
                    screenX: e.screenX,
                    screenY: e.screenY,
                    movementX: e.clientX - lastX,
                    movementY: e.clientY - lastY,
                    bubbles: true,
                    cancelable: true,
                    view: window
                });

                lastX = e.clientX;
                lastY = e.clientY;
                canvas.dispatchEvent(event);
            }
        };

        window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
    }, []);

    return (
        <div ref={containerRef} style={{
            position: 'fixed',
            top: '5vh', // Push bot down slightly to align torso with cards
            left: 0,
            width: '100vw',
            height: '110vh', // Slightly larger to allow overflow at bottom
            zIndex: 5,
            pointerEvents: 'none',
            overflow: 'hidden',
            transform: 'scale(1.15)', // Make bot feel more present and larger
            transformOrigin: 'center center'
        }}>
            <Suspense fallback={
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--c-bg)'
                }}>
                    <Loader2 className="animate-spin" size={40} color="var(--c-primary)" />
                </div>
            }>
                <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
                    <Spline
                        scene="/scene.splinecode"
                        onLoad={onLoad}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            </Suspense>

            {/* Overlay for better readability */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, transparent 0%, rgba(3,5,15,0.08) 100%)',
                pointerEvents: 'none'
            }} />
        </div>
    );
}
