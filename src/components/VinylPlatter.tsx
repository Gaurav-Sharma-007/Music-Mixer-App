import React, { useEffect, useRef } from 'react';

interface VinylPlatterProps {
    isPlaying: boolean;
    artwork?: string;
    rpm?: number;
    color: 'blue' | 'purple';
}

const VinylPlatter: React.FC<VinylPlatterProps> = ({ isPlaying, artwork, rpm = 33, color }) => {
    const platterRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>(0);
    const rotationRef = useRef<number>(0);

    const glowColor = color === 'blue' ? 'color-mix(in srgb, var(--color-neon-blue), transparent 50%)' : 'color-mix(in srgb, var(--color-neon-purple), transparent 50%)';
    const neonColor = color === 'blue' ? 'var(--color-neon-blue)' : 'var(--color-neon-purple)';

    useEffect(() => {
        let lastTime = performance.now();
        const animate = (time: number) => {
            if (isPlaying && platterRef.current) {
                const delta = time - lastTime;
                lastTime = time;
                // RPM to degrees per ms
                // 33 RPM = 0.55 rotations/sec = 198 deg/sec = 0.198 deg/ms
                const speed = (rpm === 33 ? 0.198 : 0.27) * delta;
                rotationRef.current = (rotationRef.current + speed) % 360;
                platterRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
            }
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, rpm]);

    return (
        <div className="relative w-72 h-72 mx-auto flex items-center justify-center">
            {/* Outer Glow / Base */}
            <div
                className="absolute inset-0 rounded-full transition-all duration-500"
                style={{
                    background: '#0a0a0a',
                    boxShadow: isPlaying
                        ? `0 0 40px ${glowColor}, inset 0 0 10px ${glowColor}`
                        : `0 0 15px ${glowColor}`,
                    border: `1px solid ${isPlaying ? neonColor : '#333'}`
                }}
            ></div>

            {/* The Rotating Platter */}
            <div
                ref={platterRef}
                className="w-[96%] h-[96%] rounded-full relative flex items-center justify-center overflow-hidden"
                style={{
                    background: 'conic-gradient(from 0deg, #111 0%, #1a1a1a 10%, #111 20%, #1a1a1a 30%, #111 40%, #1a1a1a 50%, #111 60%, #1a1a1a 70%, #111 80%, #1a1a1a 90%, #111 100%)',
                    boxShadow: 'inset 0 0 20px black, 0 0 10px black'
                }}
            >
                {/* Micro-grooves texture */}
                <div className="absolute inset-1 rounded-full opacity-40 mix-blend-overlay"
                    style={{
                        background: 'repeating-radial-gradient(circle at center, transparent 0, transparent 2px, #000 3px, transparent 4px)'
                    }}
                ></div>

                {/* Light Reflections (Anisotropic) */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none z-10 opacity-50"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-bl from-white/5 to-transparent pointer-events-none z-10 opacity-30"></div>

                {/* Label */}
                <div className="absolute w-24 h-24 rounded-full flex items-center justify-center border-4 border-gray-800 shadow-2xl z-20 overflow-hidden box-border"
                    style={{ background: 'white' }}
                >
                    {artwork ? (
                        <div className="w-full h-full bg-cover bg-center animate-spin-slow" style={{ backgroundImage: `url(${artwork})` }}></div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-center p-1"
                            style={{
                                background: `linear-gradient(to bottom right, var(--color-premium-black), color-mix(in srgb, ${neonColor}, black 60%))`
                            }}
                        >
                            <div className="text-[8px] font-black text-white/80 tracking-widest border-y border-white/20 py-1 uppercase scale-90">
                                FLUX<br />AUDIO
                            </div>
                        </div>
                    )}
                    {/* Spindle */}
                    <div className="absolute w-3 h-3 bg-gray-300 rounded-full shadow-inner border border-gray-400"></div>
                </div>
            </div>

            {/* Tonearm */}
            <div className={`absolute -top-4 -right-4 w-16 h-48 origin-[50%_20px] transition-transform duration-700 ease-spring z-30 pointer-events-none drop-shadow-2xl`}
                style={{
                    transform: isPlaying ? 'rotate(25deg)' : 'rotate(0deg)',
                }}
            >
                {/* Pivot Base */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-gray-800 rounded-full border-2 border-gray-600 shadow-xl flex items-center justify-center">
                    <div className="w-6 h-6 bg-gray-400 rounded-full shadow-inner bg-gradient-to-br from-gray-300 to-gray-600"></div>
                </div>

                {/* Arm Shaft */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-3 h-32 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400 shadow-lg rounded-full"></div>

                {/* Head shell */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-12 bg-black rounded-sm border-b-2 border-white/20 shadow-xl transform rotate-12 origin-top">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-white/80 shadow-[0_0_10px_white]"></div>
                </div>
            </div>
        </div>
    );
};

export default VinylPlatter;
