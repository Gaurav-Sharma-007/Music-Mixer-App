import React, { useState, useEffect, useRef } from 'react';
import { Crossfader } from '../audio/Crossfader';
import { Deck } from '../audio/Deck';
import MasterControls from './MasterControls';

interface MixerProps {
    crossfader: Crossfader;
    deckA: Deck;
    deckB: Deck;
}

const useVUMeter = (analyser: AnalyserNode | undefined) => {
    const [level, setLevel] = useState(0);
    const requestRef = useRef<number | null>(null);
    const dataArray = useRef<Uint8Array>(new Uint8Array(2048)); // Matches fftSize in Deck

    useEffect(() => {
        if (!analyser) return;

        const updateMeter = () => {
            if (!analyser) return;
            // @ts-expect-error - Uint8Array type mismatch with Web Audio API
            analyser.getByteTimeDomainData(dataArray.current);

            // Calculate RMS (Root Mean Square)
            let sum = 0;
            for (let i = 0; i < dataArray.current.length; i++) {
                const x = (dataArray.current[i] - 128) / 128; // Normalize to -1..1
                sum += x * x;
            }
            const rms = Math.sqrt(sum / dataArray.current.length);

            // Boost signal slightly for better visual
            setLevel(Math.min(rms * 4, 1));

            requestRef.current = requestAnimationFrame(updateMeter);
        };

        requestRef.current = requestAnimationFrame(updateMeter);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [analyser]);

    return level;
};

const Mixer: React.FC<MixerProps> = ({ crossfader, deckA, deckB }) => {
    const [faderValue, setFaderValue] = useState(0.5);
    const [isAutoFading, setIsAutoFading] = useState(false);
    const animationFrameRef = useRef<number | null>(null);
    const levelA = useVUMeter(deckA?.getAnalyser());
    const levelB = useVUMeter(deckB?.getAnalyser());

    const handleCrossfaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Cancel any active auto-fade if manual control is touched
        if (isAutoFading) {
            setIsAutoFading(false);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }

        const val = parseFloat(e.target.value);
        setFaderValue(val);
        crossfader.setFaderPosition(val);
    };

    const triggerAutoFade = () => {
        // Determine target: if < 0.5 go to 1 (Deck B), else go to 0 (Deck A)
        const target = faderValue < 0.5 ? 1 : 0;
        const startValue = faderValue;
        const duration = 5000; // 5 seconds
        const startTime = performance.now();

        setIsAutoFading(true);

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Linear interpolation
            const newValue = startValue + (target - startValue) * progress;

            setFaderValue(newValue);
            crossfader.setFaderPosition(newValue);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                setIsAutoFading(false);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Cleanup animation on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    // Helper to render bars
    const renderBars = (level: number) => {
        // 20 bars total
        const activeBars = Math.ceil(level * 20);
        return Array.from({ length: 20 }).map((_, i) => {
            const isActive = i < activeBars;
            const isRed = i > 15;
            const isYellow = i > 12;

            let bgClass = 'bg-green-500/20'; // Inactive base
            if (isActive) {
                if (isRed) bgClass = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]';
                else if (isYellow) bgClass = 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]';
                else bgClass = 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]';
            }

            return (
                <div
                    key={i}
                    className={`w-full h-[3%] rounded-sm mb-[2%] transition-colors duration-75 ${bgClass}`}
                ></div>
            );
        });
    };

    return (
        <div className="flex flex-col items-center justify-between h-full w-full gap-4">
            <h2 className="text-xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500 uppercase tracking-[0.2em]">Mixer</h2>

            <MasterControls />

            {/* VU Meters (Real-time) */}
            <div className="flex gap-4 mb-4 h-48">
                {/* Deck A Meter */}
                <div className="flex flex-col gap-[2px] items-center">
                    <span className="text-[9px] font-mono text-gray-500 mb-1">DK A</span>
                    <div className="w-3 h-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative flex flex-col-reverse p-[2px]">
                        {renderBars(levelA)}
                        <div className="absolute bottom-0 left-[2px] right-[2px] top-[40%] bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 opacity-20 mix-blend-overlay pointer-events-none"></div>
                    </div>
                </div>

                {/* Deck B Meter */}
                <div className="flex flex-col gap-[2px] items-center">
                    <span className="text-[9px] font-mono text-gray-500 mb-1">DK B</span>
                    <div className="w-3 h-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative flex flex-col-reverse p-[2px]">
                        {renderBars(levelB)}
                        <div className="absolute bottom-0 left-[2px] right-[2px] top-[40%] bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 opacity-20 mix-blend-overlay pointer-events-none"></div>
                    </div>
                </div>
            </div>

            {/* Crossfader Section */}
            <div className="w-full mt-auto flex flex-col gap-4">
                <div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-2 font-mono tracking-wider px-1">
                        <span className="text-neon-blue">DECK A</span>
                        <span className="text-neon-purple">DECK B</span>
                    </div>

                    <div className="relative w-full h-12 bg-black/50 rounded-lg border border-white/10 shadow-inner flex items-center px-2">
                        {/* Track line */}
                        <div className="absolute left-4 right-4 h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className="w-1/2 h-full bg-gradient-to-r from-neon-blue/50 to-transparent"></div>
                            <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-neon-purple/50 to-transparent"></div>
                        </div>

                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.001"
                            value={faderValue}
                            onChange={handleCrossfaderChange}
                            className="relative z-10 w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-10 [&::-webkit-slider-thumb]:bg-gradient-to-b [&::-webkit-slider-thumb]:from-gray-200 [&::-webkit-slider-thumb]:to-gray-400 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/50 [&::-webkit-slider-thumb]:shadow-[0_4px_10px_rgba(0,0,0,0.5)] active:[&::-webkit-slider-thumb]:scale-95 transition-transform"
                        />
                    </div>
                </div>

                {/* Auto Fade Control */}
                <button
                    onClick={triggerAutoFade}
                    disabled={isAutoFading}
                    className={`
                        w-full py-2 rounded-md text-xs font-bold tracking-widest uppercase transition-all duration-300
                        ${isAutoFading
                            ? 'bg-gradient-to-r from-neon-blue via-purple-500 to-neon-purple text-white animate-pulse shadow-[0_0_15px_rgba(139,92,246,0.5)]'
                            : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 hover:border-white/20'
                        }
                    `}
                >
                    {isAutoFading ? 'Mixing...' : 'Auto Mix (5s)'}
                </button>
            </div>
        </div>
    );
};

export default Mixer;
