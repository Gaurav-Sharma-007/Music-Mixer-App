import React, { useState } from 'react';
import { Deck } from '../audio/Deck';
import FileLoader from './FileLoader';
import AnalyzerCanvas from '../visualizer/AnalyzerCanvas';

interface DeckControlsProps {
    deck: Deck;
    title: string;
    color: 'blue' | 'purple';
}

const DeckControls: React.FC<DeckControlsProps> = ({ deck, title, color }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [eq, setEq] = useState({ low: 1, mid: 1, high: 1 });
    const [trackName, setTrackName] = useState('No Track Loaded');
    const [isLoaded, setIsLoaded] = useState(false);

    const accentColor = color === 'blue' ? 'text-neon-blue' : 'text-neon-purple';
    const glowColor = color === 'blue' ? 'shadow-[0_0_30px_rgba(77,159,255,0.3)]' : 'shadow-[0_0_30px_rgba(181,55,242,0.3)]';
    const buttonBg = color === 'blue' ? 'bg-neon-blue' : 'bg-neon-purple';

    const handleFileSelect = async (file: File) => {
        try {
            setTrackName('Loading...');
            const arrayBuffer = await file.arrayBuffer();
            await deck.load(arrayBuffer);
            setTrackName(file.name);
            setIsLoaded(true);
        } catch (error) {
            console.error('Failed to load file', error);
            setTrackName('Error loading file');
            setIsLoaded(false);
        }
    };

    const togglePlay = () => {
        if (isPlaying) {
            deck.stop();
            setIsPlaying(false);
        } else {
            if (isLoaded) {
                deck.play();
                setIsPlaying(true);
            }
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        deck.setVolume(val);
    };

    const handleEQChange = (band: 'low' | 'mid' | 'high', val: number) => {
        const newEq = { ...eq, [band]: val };
        setEq(newEq);
        deck.setEQ(newEq.low, newEq.mid, newEq.high);
    };

    return (
        <div className={`p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 ${glowColor} transition-all duration-300 w-full`}>

            {/* Header / Track Info */}
            <div className="flex flex-col items-center mb-6">
                <h2 className={`text-2xl font-black tracking-widest ${accentColor} mb-2`}>{title}</h2>
                <div className="w-full bg-black/50 rounded-lg p-3 border border-white/5 text-center min-h-[3rem] flex items-center justify-center">
                    <span className="text-sm font-mono text-gray-300 truncate w-full px-2">
                        {trackName}
                    </span>
                </div>
            </div>

            {/* Visualizer */}
            <div className="mb-6 rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-inner h-32 relative group">
                <AnalyzerCanvas analyser={deck.getAnalyser()} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
            </div>

            {/* Main Controls - Grid Layout */}
            <div className="grid grid-cols-4 gap-4 mb-6">

                {/* EQ Section - Vertical Sliders */}
                <div className="col-span-3 grid grid-cols-3 gap-2 bg-black/20 rounded-xl p-3 border border-white/5">
                    {['low', 'mid', 'high'].map((band) => (
                        <div key={band} className="flex flex-col items-center h-40 justify-between py-2 group">
                            <div className="relative w-2 h-full bg-gray-800 rounded-full overflow-hidden group-hover:bg-gray-700 transition-colors">
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={eq[band as keyof typeof eq]}
                                    onChange={(e) => handleEQChange(band as any, parseFloat(e.target.value))}
                                    className="absolute -rotate-90 w-32 h-2 origin-center -translate-x-[60px] translate-y-[64px] bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                />
                                {/* Visual Fill Level (Simplistic) */}
                                <div
                                    className={`absolute bottom-0 left-0 right-0 ${buttonBg} opacity-50 transition-all duration-75`}
                                    style={{ height: `${(eq[band as keyof typeof eq] / 2) * 100}%` }}
                                ></div>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mt-2 group-hover:text-white transition-colors">{band}</span>
                        </div>
                    ))}
                </div>

                {/* Vertical Volume */}
                <div className="col-span-1 flex flex-col items-center bg-black/20 rounded-xl p-3 border border-white/5 h-48 justify-between">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">VOL</span>
                    <div className="relative w-4 h-full bg-gray-800 rounded-full overflow-hidden">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="absolute -rotate-90 w-40 h-4 origin-center -translate-x-[72px] translate-y-[80px] bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
                        />
                        <div
                            className={`absolute bottom-0 left-0 right-0 ${buttonBg} transition-all duration-75`}
                            style={{ height: `${volume * 100}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Transport Controls */}
            <div className="flex justify-between items-center gap-4">
                <div className="flex-1">
                    <FileLoader onFileSelect={handleFileSelect} />
                </div>

                <button
                    onClick={togglePlay}
                    disabled={!isLoaded}
                    className={`
                        w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl
                        ${isPlaying
                            ? 'bg-gradient-to-br from-red-500 to-red-600 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-95 border-2 border-red-400'
                            : isLoaded
                                ? 'bg-gradient-to-br from-green-400 to-green-600 hover:scale-105 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] border-2 border-green-300'
                                : 'bg-gray-800 cursor-not-allowed opacity-50'}
                    `}
                >
                    {isPlaying ? (
                        <div className="w-4 h-4 bg-white rounded-sm shadow-sm"></div>
                    ) : (
                        <div className="w-0 h-0 border-l-[16px] border-l-white border-y-[10px] border-y-transparent ml-1 drop-shadow-sm"></div>
                    )}
                </button>
            </div>
        </div>
    );
};

export default DeckControls;
