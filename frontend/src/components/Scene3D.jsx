import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

const ORB_LIST = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    position: [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10 - 5
    ],
    scale: Math.random() * 1.5 + 0.5,
    speed: Math.random() * 0.003 + 0.001,
    phase: Math.random() * Math.PI * 2,
    color: ['#6366f1', '#8b5cf6', '#a78bfa', '#4f46e5', '#7c3aed', '#06b6d4'][i]
}));

const STAR_POSITIONS = (() => {
    const count = 3000;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 80;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 80;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
})();

function FloatingOrbs() {
    const orbsRef = useRef([]);
    const orbs = ORB_LIST;

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        orbsRef.current.forEach((ref, i) => {
            if (ref) {
                const orb = orbs[i];
                ref.position.y = orbs[i].position[1] + Math.sin(t * orb.speed * 100 + orb.phase) * 1.5;
                ref.position.x = orbs[i].position[0] + Math.cos(t * orb.speed * 80 + orb.phase) * 0.8;
                ref.rotation.x += 0.003;
                ref.rotation.y += 0.005;
            }
        });
    });

    return (
        <>
            {orbs.map((orb, i) => (
                <mesh
                    key={orb.id}
                    ref={el => orbsRef.current[i] = el}
                    position={orb.position}
                >
                    <icosahedronGeometry args={[orb.scale, 1]} />
                    <meshStandardMaterial
                        color={orb.color}
                        wireframe
                        transparent
                        opacity={0.08}
                        emissive={orb.color}
                        emissiveIntensity={0.15}
                    />
                </mesh>
            ))}
        </>
    );
}

function StarField() {
    const starsRef = useRef();

    const positions = STAR_POSITIONS;

    useFrame((state) => {
        if (starsRef.current) {
            starsRef.current.rotation.x = state.clock.getElapsedTime() * 0.01;
            starsRef.current.rotation.y = state.clock.getElapsedTime() * 0.005;
        }
    });

    return (
        <Points ref={starsRef} positions={positions} stride={3}>
            <PointMaterial
                size={0.05}
                color="#a78bfa"
                transparent
                opacity={0.4}
                sizeAttenuation
            />
        </Points>
    );
}

function RingsOrb() {
    const ringRef = useRef();
    const ring2Ref = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (ringRef.current) {
            ringRef.current.rotation.x = t * 0.2;
            ringRef.current.rotation.y = t * 0.3;
        }
        if (ring2Ref.current) {
            ring2Ref.current.rotation.x = -t * 0.15;
            ring2Ref.current.rotation.z = t * 0.2;
        }
    });

    return (
        <group position={[8, -4, -8]}>
            <mesh>
                <sphereGeometry args={[1.8, 32, 32]} />
                <meshStandardMaterial
                    color="#4f46e5"
                    transparent
                    opacity={0.08}
                    wireframe
                />
            </mesh>
            <mesh ref={ringRef}>
                <torusGeometry args={[2.8, 0.04, 16, 100]} />
                <meshStandardMaterial color="#6366f1" transparent opacity={0.25} emissive="#6366f1" emissiveIntensity={0.5} />
            </mesh>
            <mesh ref={ring2Ref}>
                <torusGeometry args={[3.5, 0.03, 16, 100]} />
                <meshStandardMaterial color="#a78bfa" transparent opacity={0.2} emissive="#a78bfa" emissiveIntensity={0.4} />
            </mesh>
        </group>
    );
}

function GridPlane() {
    return (
        <gridHelper
            args={[60, 40, '#1e1b4b', '#1e1b4b']}
            position={[0, -12, 0]}
            rotation={[0, 0, 0]}
        />
    );
}

export default function Scene3D() {
    const { theme } = useTheme();

    /* ── LIGHT MODE: plain gradient background, no 3D ── */
    if (theme === 'light') {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none',
                background: 'linear-gradient(145deg, #eef0fb 0%, #e8ecf8 40%, #f0edfb 70%, #ebf4fb 100%)',
            }} />
        );
    }

    /* ── DARK MODE: full 3D scene + dark overlay ── */
    return (
        <>
            <Canvas
                camera={{ position: [0, 0, 15], fov: 60 }}
                style={{ position: 'fixed', inset: 0, zIndex: -1 }}
                gl={{ antialias: true, alpha: true }}
            >
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} color="#6366f1" intensity={1.5} />
                <pointLight position={[-10, -10, 10]} color="#06b6d4" intensity={1} />
                <pointLight position={[0, 5, 5]} color="#a78bfa" intensity={0.6} />
                <StarField />
                <FloatingOrbs />
                <RingsOrb />
                <GridPlane />
            </Canvas>
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                background: 'rgba(3,5,15,0.72)',
            }} />
        </>
    );
}
