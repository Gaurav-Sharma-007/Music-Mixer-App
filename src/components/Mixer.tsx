import React, { useState } from 'react';
import { Crossfader } from '../audio/Crossfader';

interface MixerProps {
    crossfader: Crossfader;
}

const Mixer: React.FC<MixerProps> = ({ crossfader }) => {
    const [faderValue, setFaderValue] = useState(0.5);

    const handleCrossfaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setFaderValue(val);
        crossfader.setFaderPosition(val);
    };

    return (
        <div className="flex flex-col items-center justify-between h-full w-full">
            <h2 className="text-xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500 uppercase tracking-[0.2em]">Mixer</h2>

            {/* VU Meters (Visual only for now) */}
            <div className="flex gap-4 mb-4 h-48">
                <div className="flex flex-col gap-[2px] items-center">
                    <span className="text-[9px] font-mono text-gray-500 mb-1">DK A</span>
                    <div className="w-3 h-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative flex flex-col-reverse p-[2px]">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className={`w-full h-[3%] rounded-sm mb-[2%] ${i > 15 ? 'bg-red-500/20' : i > 12 ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}></div>
                        ))}
                        {/* Fake activity for visual */}
                        <div className="absolute bottom-0 left-[2px] right-[2px] top-[40%] bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 opacity-80 mix-blend-overlay"></div>
                    </div>
                </div>

                <div className="flex flex-col gap-[2px] items-center">
                    <span className="text-[9px] font-mono text-gray-500 mb-1">DK B</span>
                    <div className="w-3 h-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative flex flex-col-reverse p-[2px]">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className={`w-full h-[3%] rounded-sm mb-[2%] ${i > 15 ? 'bg-red-500/20' : i > 12 ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}></div>
                        ))}
                        {/* Fake activity for visual */}
                        <div className="absolute bottom-0 left-[2px] right-[2px] top-[40%] bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 opacity-80 mix-blend-overlay"></div>
                    </div>
                </div>
            </div>

            {/* Crossfader Section */}
            <div className="w-full mt-auto">
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
                        step="0.01"
                        value={faderValue}
                        onChange={handleCrossfaderChange}
                        className="relative z-10 w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-10 [&::-webkit-slider-thumb]:bg-gradient-to-b [&::-webkit-slider-thumb]:from-gray-200 [&::-webkit-slider-thumb]:to-gray-400 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/50 [&::-webkit-slider-thumb]:shadow-[0_4px_10px_rgba(0,0,0,0.5)] active:[&::-webkit-slider-thumb]:scale-95 transition-transform"
                    />
                </div>
            </div>
        </div>
    );
};

export default Mixer;
