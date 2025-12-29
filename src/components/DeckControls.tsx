import React, { useState } from 'react';
import { Deck } from '../audio/Deck';
import FileLoader from './FileLoader';
import VinylPlatter from './VinylPlatter';

interface DeckControlsProps {
    deck: Deck;
    title: string;
    color: 'blue' | 'purple';
}

const DeckControls: React.FC<DeckControlsProps> = ({ deck, title, color }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [eq, setEq] = useState({ low: 1, mid: 1, high: 1 });
    const [fx, setFx] = useState({ delay: 0, reverb: 0 });
    const [trackName, setTrackName] = useState('No Track Loaded');
    const [isLoaded, setIsLoaded] = useState(false);
    const [inputType, setInputType] = useState<'file' | 'external'>('file');

    const accentColor = color === 'blue' ? 'text-neon-blue' : 'text-neon-purple';
    const borderColor = color === 'blue' ? 'border-neon-blue/30' : 'border-neon-purple/30';

    const handleFileSelect = async (file: File) => {
        try {
            setTrackName('Loading...');
            const arrayBuffer = await file.arrayBuffer();
            await deck.load(arrayBuffer);
            setTrackName(file.name);
            setIsLoaded(true);
            setInputType('file');
        } catch (error) {
            console.error('Failed to load file', error);
            setTrackName('Error loading file');
            setIsLoaded(false);
        }
    };

    const handleExternalInput = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { width: 1, height: 1 }, // Minimal video
                audio: {
                    // @ts-expect-error - experimental property
                    suppressLocalAudioPlayback: true,
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                    channelCount: 2
                }
            });

            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) {
                alert("No audio track found. Make sure to share 'Tab Audio' or 'System Audio'.");
                return;
            }

            // Stop video immediately
            stream.getVideoTracks().forEach(t => t.stop());

            await deck.loadStream(new MediaStream([audioTrack]));
            setTrackName('External Input (Live)');
            setIsLoaded(true);
            setIsPlaying(true); // Auto-play for live stream
            setInputType('external');
            deck.play();
        } catch (err) {
            console.error(err);
        }
    };

    const togglePlay = () => {
        if (inputType === 'external') {
            // For external, stop might mean mute or disconnect?
            // For now, simpler to just let gain handle mute or deck.stop
            if (isPlaying) {
                deck.stop();
                setIsPlaying(false);
                setIsLoaded(false); // Reset for external? Or just pause?
            }
            return;
        }

        if (isPlaying) {
            deck.pause();
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

    const mapSliderToGain = (val: number): number => {
        if (val < 1) {
            return (val - 1) * 26;
        } else {
            return (val - 1) * 6;
        }
    };

    const handleEQChange = (band: 'low' | 'mid' | 'high', val: number) => {
        const newEq = { ...eq, [band]: val };
        setEq(newEq);
        deck.setEQ(
            mapSliderToGain(band === 'low' ? val : newEq.low),
            mapSliderToGain(band === 'mid' ? val : newEq.mid),
            mapSliderToGain(band === 'high' ? val : newEq.high)
        );
    };

    const handleFxChange = (effect: 'delay' | 'reverb', val: number) => {
        const newFx = { ...fx, [effect]: val };
        setFx(newFx);
        if (effect === 'delay') deck.delay.setMix(val);
        if (effect === 'reverb') deck.reverb.setMix(val);
    };

    const bands: Array<'low' | 'mid' | 'high'> = ['low', 'mid', 'high'];

    return (
        <div className={`p-6 rounded-3xl bg-zinc-900 border ${borderColor} shadow-2xl relative overflow-hidden transition-all duration-300 w-full`}>
            {/* Top Info Bar */}
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <h2 className={`text-xl font-black ${accentColor} tracking-widest uppercase`}>{title}</h2>
                <div className="flex gap-2 text-xs">
                    <button
                        onClick={() => { }}
                        className={`px-3 py-1 rounded-full border ${inputType === 'file' ? 'bg-white/10 border-white/30 text-white' : 'border-white/10 text-gray-500'}`}
                    >
                        FILE
                    </button>
                    <button
                        onClick={handleExternalInput}
                        className={`px-3 py-1 rounded-full border ${inputType === 'external' ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'border-white/10 text-gray-500 hover:text-white'}`}
                    >
                        EXTERNAL
                    </button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
                {/* Turntable Platter */}
                <div className="flex-1 flex flex-col items-center">
                    <div className="relative group cursor-pointer scale-95 xl:scale-100 transition-transform" onClick={togglePlay}>
                        <VinylPlatter isPlaying={isPlaying} color={color} />

                        {/* Play/Pause Overlay on Hover */}
                        <div className={`absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <div className="bg-white/90 text-black text-xs font-bold py-1 px-3 rounded-full uppercase tracking-wider shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                {isPlaying ? 'Stop' : 'Play'}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 w-full max-w-[200px]">
                        <div className="text-[10px] font-bold text-gray-500 text-center mb-1 tracking-widest">TEMPO</div>
                        <input
                            type="range"
                            min="0.92"
                            max="1.08"
                            step="0.001"
                            defaultValue="1"
                            className="w-full h-1 bg-gray-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gray-300 [&::-webkit-slider-thumb]:rounded-sm"
                        />
                    </div>
                </div>

                {/* Mixer Strip */}
                <div className="flex-none w-full xl:w-32 flex flex-col gap-6 bg-black/20 rounded-xl p-4 border border-white/5">

                    {/* EQ Section */}
                    <div className="space-y-4">
                        <div className="text-[10px] font-bold text-gray-500 text-center tracking-widest border-b border-white/5 pb-1">EQ</div>
                        {bands.map((band) => (
                            <div key={band} className="flex flex-col items-center gap-1">
                                <div className="text-[9px] uppercase text-gray-400 font-mono">{band}</div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={eq[band]}
                                    onChange={(e) => handleEQChange(band, parseFloat(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-300"
                                />
                            </div>
                        ))}
                    </div>

                    {/* FX Section */}
                    <div className="space-y-4">
                        <div className="text-[10px] font-bold text-neon-blue text-center tracking-widest border-b border-white/5 pb-1">FX</div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="text-[9px] uppercase text-gray-400 font-mono">DLY</div>
                            <input
                                type="range"
                                min="0"
                                max="0.8"
                                step="0.01"
                                value={fx.delay}
                                onChange={(e) => handleFxChange('delay', parseFloat(e.target.value))}
                                className="w-full h-1 bg-gray-700 rounded appearance-none [&::-webkit-slider-thumb]:bg-neon-blue [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="text-[9px] uppercase text-gray-400 font-mono">VRB</div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={fx.reverb}
                                onChange={(e) => handleFxChange('reverb', parseFloat(e.target.value))}
                                className="w-full h-1 bg-gray-700 rounded appearance-none [&::-webkit-slider-thumb]:bg-neon-purple [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="mt-6 pt-4 border-t border-white/5 flex flex-col gap-4 relative z-10">
                <div className="w-full bg-[#111] h-10 rounded-md border border-white/10 flex items-center px-3 relative overflow-hidden shadow-inner">
                    <div className={`text-xs font-mono ${accentColor} truncate z-10 w-full text-center`}>{trackName}</div>
                    {/* Spectrum bg visual (fake) */}
                    <div className={`absolute bottom-0 right-0 left-0 h-4 bg-gradient-to-t ${color === 'blue' ? 'from-blue-500/10' : 'from-purple-500/10'} to-transparent`}></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                    <FileLoader onFileSelect={handleFileSelect} />

                    {/* Main Volume Fader - Fixed Layout */}
                    <div className="flex items-center gap-3 bg-black/30 p-2 rounded-lg border border-white/5 w-full">
                        <span className="text-[10px] font-bold text-gray-500 w-6 text-center">VOL</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="flex-1 h-2 bg-gray-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_white]"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeckControls;
