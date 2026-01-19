import React, { useState } from 'react';
import { Deck } from '../audio/Deck';
import FileLoader from './FileLoader';
import VinylPlatter from './VinylPlatter';
import SourceSelector from './SourceSelector';
import { EQ_PRESETS, type EQPresetName } from '../audio/EQPresets';

interface DeckControlsProps {
    deck: Deck;
    title: string;
    color: 'blue' | 'purple';
    externalLoad?: { file: File; ts: number } | null;
}

const DeckControls: React.FC<DeckControlsProps> = ({ deck, title, color, externalLoad }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.8);
    // Initialize 8 bands centered at 1 (0dB)
    const [eqGains, setEqGains] = useState<number[]>([1, 1, 1, 1, 1, 1, 1, 1]);
    const [fx, setFx] = useState({ delay: 0, reverb: 0 });
    const [trackName, setTrackName] = useState('No Track Loaded');
    const [isLoaded, setIsLoaded] = useState(false);
    const [inputType, setInputType] = useState<'file' | 'external'>('file');
    const [sampleLoaded, setSampleLoaded] = useState([false, false, false, false]);
    const [showSourceSelector, setShowSourceSelector] = useState(false);

    // YouTube Integration States
    const [showYoutubeInput, setShowYoutubeInput] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    // Search States
    const [apiKey, setApiKey] = useState(localStorage.getItem('yt_api_key') || '');
    const [apiKeyInput, setApiKeyInput] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const accentColor = color === 'blue' ? 'text-neon-blue' : 'text-neon-purple';
    const borderColor = color === 'blue' ? 'border-neon-blue/30' : 'border-neon-purple/30';

    // Handle External File Load (Queue)
    React.useEffect(() => {
        if (externalLoad) {
            handleFileSelect(externalLoad.file);
        }
    }, [externalLoad]);

    const handleYoutubeSearch = async () => {
        if (!youtubeUrl) return;

        // If it looks like a URL, just load it
        if (youtubeUrl.includes('http') || youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be')) {
            handleYoutubeSubmit(youtubeUrl);
            return;
        }

        if (!apiKey) {
            alert("No API Key found. Please enter a YouTube Data API Key.");
            return;
        }

        setIsDownloading(true); // Re-use loading state for UI feedback
        try {
            if (window.electronAPI && window.electronAPI.searchYoutube) {
                const results = await window.electronAPI.searchYoutube(youtubeUrl, apiKey);
                setSearchResults(results);
            }
        } catch (e) {
            console.error(e);
            alert("Search failed. Check API Key or Quota.");
        } finally {
            setIsDownloading(false);
        }
    };

    const [gateThreshold, setGateThreshold] = useState(-50);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1.0);

    // Initial sync
    React.useEffect(() => {
        if (deck.noiseGate) {
            // Deck initializes gate, we just control it
        }
    }, [deck]);

    // Animation Loop for Seek Bar & Timer
    React.useEffect(() => {
        let rafId: number;
        const loop = () => {
            if (isPlaying) {
                setCurrentTime(deck.getCurrentTime());
                setDuration(deck.getDuration());
            }
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [deck, isPlaying]);

    const handleFileSelect = async (file: File) => {
        try {
            setTrackName('Loading...');
            const arrayBuffer = await file.arrayBuffer();
            await deck.load(arrayBuffer);
            setTrackName(file.name);
            setDuration(deck.getDuration());
            setIsLoaded(true);
            setInputType('file');

            // Auto-play on load
            deck.play();
            setIsPlaying(true);
        } catch (error) {
            console.error('Failed to load file', error);
            setTrackName('Error loading file');
            setIsLoaded(false);
        }
    };


    const handleSourceSelected = async (sourceId: string) => {
        setShowSourceSelector(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId
                    },
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                    googAutoGainControl: false,
                    channelCount: 2
                } as any,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId,
                        maxFrameRate: 1
                    }
                }
            } as any);

            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) {
                alert("No audio track found. Ensure you selected a source with audio.");
                return;
            }

            stream.getVideoTracks().forEach(t => t.stop());

            await deck.loadStream(new MediaStream([audioTrack]));
            setTrackName('External Input (Live)');
            setIsLoaded(true);
            setIsPlaying(true);
            setInputType('external');
            deck.play();
        } catch (err) {
            console.error("Error capturing system audio:", err);
            alert("Failed to capture audio. Permission denied or invalid source.");
        }
    };

    const handleYoutubeClick = () => {
        setShowYoutubeInput(true);
    };

    const handleYoutubeSubmit = async (urlToLoad?: string) => {
        const targetUrl = typeof urlToLoad === 'string' ? urlToLoad : youtubeUrl;
        if (!targetUrl) return;

        setIsDownloading(true);
        try {
            if (window.electronAPI) {
                setTrackName('Downloading YouTube...');
                const rawBuffer = await window.electronAPI.loadYoutube(targetUrl);

                console.log("Received buffer from Main:", rawBuffer);

                // Electron IPC sends Buffer as Uint8Array. 
                // deck.load expects ArrayBuffer. 
                // If rawBuffer is Uint8Array (which has .buffer), use that.
                // We cast to any to avoid TS errors since we know runtime behavior differs from strict .d.ts
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const arrayBuffer = (rawBuffer as any).buffer ? (rawBuffer as any).buffer : rawBuffer;

                if (arrayBuffer.byteLength === 0) {
                    throw new Error("Received empty audio buffer");
                }

                await deck.load(arrayBuffer);
                setTrackName('YouTube Track');
                setDuration(deck.getDuration());
                setIsLoaded(true);
                setInputType('file');

                deck.play();
                setIsPlaying(true);

                setShowYoutubeInput(false);
                setYoutubeUrl(''); // Reset search bar
                setSearchResults([]); // Reset results
            } else {
                alert("YouTube integration requires Electron App");
            }
        } catch (error) {
            console.error("YouTube Load Failed", error);
            setTrackName('Download Failed');
            alert("Failed to load YouTube URL. Check console.");
        } finally {
            setIsDownloading(false);
        }
    };

    const togglePlay = () => {
        if (inputType === 'external') {
            if (isPlaying) {
                deck.stop();
                setIsPlaying(false);
                setIsLoaded(false);
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

    const handleEQChange = (index: number, val: number) => {
        const newEq = [...eqGains];
        newEq[index] = val;
        setEqGains(newEq);
        deck.setEQGain(index, mapSliderToGain(val));
    };

    const applyPreset = (presetName: EQPresetName) => {
        const presetGains = EQ_PRESETS[presetName];
        if (presetGains) {
            setEqGains(presetGains);
            presetGains.forEach((gain, index) => {
                deck.setEQGain(index, mapSliderToGain(gain));
            });
        }
    };

    const handleFxChange = (effect: 'delay' | 'reverb', val: number) => {
        const newFx = { ...fx, [effect]: val };
        setFx(newFx);
        if (effect === 'delay') deck.delay.setMix(val);
        if (effect === 'reverb') deck.reverb.setMix(val);
    };

    const handleGateChange = (val: number) => {
        setGateThreshold(val);
        deck.noiseGate.setThreshold(val);
    };

    const [isolator, setIsolator] = useState({ low: 0.5, mid: 0.5, high: 0.5 });
    const handleIsolatorChange = (band: 'low' | 'mid' | 'high', val: number) => {
        setIsolator(prev => ({ ...prev, [band]: val }));
        deck.setIsolatorGain(band, val);
    };

    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setSpeed(val);
        deck.setSpeed(val);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        deck.seek(time);
    };

    const formatTime = (t: number) => {
        const min = Math.floor(t / 60);
        const sec = Math.floor(t % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const handleBrake = () => {
        deck.brake();
        setTimeout(() => setIsPlaying(false), 1000);
    };

    const handleSamplerClick = async (index: number) => {
        if (!sampleLoaded[index]) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const buffer = await file.arrayBuffer();
                    await deck.loadSample(index, buffer);
                    const newLoaded = [...sampleLoaded];
                    newLoaded[index] = true;
                    setSampleLoaded(newLoaded);
                }
            };
            input.click();
        } else {
            deck.playSample(index);
        }
    };

    const handleSamplerContextMenu = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        if (sampleLoaded[index]) {
            deck.unloadSample(index);
            const newLoaded = [...sampleLoaded];
            newLoaded[index] = false;
            setSampleLoaded(newLoaded);
        }
    };

    const bands = ['60', '150', '400', '1K', '2.4K', '6K', '12K', '15K'];

    return (
        <div className={`p-6 rounded-3xl bg-zinc-900 border ${borderColor} shadow-2xl relative overflow-hidden transition-all duration-300 w-full`}>

            {/* YouTube Input Modal */}
            {showYoutubeInput && (
                <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-6 backdrop-blur-md">
                    <div className="w-full max-w-sm flex flex-col gap-4 max-h-full">
                        <h3 className={`text-sm font-bold ${accentColor} tracking-widest uppercase mb-2 flex justify-between items-center`}>
                            <span>YouTube Search</span>
                            {localStorage.getItem('yt_api_key') && (
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('yt_api_key');
                                        setApiKey(''); // Force re-render/reset
                                    }}
                                    className="text-[10px] text-gray-500 hover:text-red-400"
                                >
                                    CLEAR KEY
                                </button>
                            )}
                        </h3>

                        {!apiKey ? (
                            <div className="space-y-2">
                                <p className="text-[10px] text-gray-400">Enter YouTube Data API v3 Key to enable search.</p>
                                <input
                                    type="text"
                                    value={apiKeyInput}
                                    onChange={e => setApiKeyInput(e.target.value)}
                                    placeholder="Paste API Key..."
                                    className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                                />
                                <button
                                    onClick={() => {
                                        if (apiKeyInput) {
                                            localStorage.setItem('yt_api_key', apiKeyInput);
                                            setApiKey(apiKeyInput);
                                        }
                                    }}
                                    className="w-full px-4 py-2 rounded text-xs font-bold bg-white text-black hover:bg-gray-200"
                                >
                                    SAVE KEY
                                </button>
                                <div className="text-center text-[10px] text-gray-500">- OR -</div>
                                <input
                                    type="text"
                                    value={youtubeUrl}
                                    onChange={e => setYoutubeUrl(e.target.value)}
                                    placeholder="Paste Direct Video URL..."
                                    className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                                />
                                <button
                                    onClick={() => handleYoutubeSubmit(youtubeUrl)}
                                    disabled={isDownloading || !youtubeUrl}
                                    className={`w-full px-4 py-2 rounded text-xs font-bold ${accentColor} border border-current hover:bg-white/10 ${isDownloading ? 'opacity-50' : ''}`}
                                >
                                    LOAD URL
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={youtubeUrl}
                                        onChange={e => setYoutubeUrl(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleYoutubeSearch();
                                        }}
                                        placeholder="Search or Paste URL..."
                                        className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleYoutubeSearch}
                                        disabled={isDownloading}
                                        className={`px-4 py-1.5 rounded text-xs font-bold bg-white text-black hover:bg-gray-200 ${isDownloading ? 'opacity-50' : ''}`}
                                    >
                                        GO
                                    </button>
                                </div>

                                {/* Results List */}
                                <div className="flex-1 overflow-y-auto space-y-2 min-h-0 border-t border-white/5 pt-2 max-h-[200px] scrollbar-thin scrollbar-thumb-gray-700">
                                    {searchResults.map((result) => (
                                        <div
                                            key={result.id}
                                            onClick={() => handleYoutubeSubmit(`https://www.youtube.com/watch?v=${result.id}`)}
                                            className="flex gap-3 p-2 hover:bg-white/10 rounded cursor-pointer group transition-colors"
                                        >
                                            <img src={result.thumbnail} alt="" className="w-12 h-9 object-cover rounded opacity-80 group-hover:opacity-100" />
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <div className="text-xs text-white font-bold truncate">{result.title}</div>
                                                <div className="text-[10px] text-gray-400 truncate">{result.channel}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {searchResults.length === 0 && youtubeUrl && !youtubeUrl.includes('http') && (
                                        <div className="text-center text-[10px] text-gray-500 py-4">Press GO to search</div>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="flex justify-end pt-2 border-t border-white/5">
                            <button onClick={() => setShowYoutubeInput(false)} className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white">Close</button>
                        </div>
                    </div>
                </div>
            )}

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
                        onClick={handleYoutubeClick}
                        className={`px-3 py-1 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-white transition-colors`}
                    >
                        YOUTUBE
                    </button>
                </div>
            </div>

            {showSourceSelector && (
                <SourceSelector
                    onSelect={handleSourceSelected}
                    onCancel={() => setShowSourceSelector(false)}
                />
            )}

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

                    <div className="mt-6 w-full max-w-[200px] space-y-4">
                        {/* SPEED CONTROL */}
                        <div>
                            <div className="flex justify-between items-center mb-2 gap-2">
                                <div className="text-[10px] font-bold text-gray-500 tracking-widest shrink-0">TEMPO</div>

                                {/* Manual Input */}
                                <div className="relative group">
                                    <input
                                        type="number"
                                        min="0.5"
                                        max="1.5"
                                        step="0.01"
                                        value={speed}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) {
                                                setSpeed(val);
                                                deck.setSpeed(val);
                                            }
                                        }}
                                        className={`w-16 text-[10px] font-mono font-bold ${accentColor} bg-black/40 px-2 py-0.5 rounded border border-white/10 outline-none focus:border-${color === 'blue' ? 'neon-blue' : 'neon-purple'} text-center transition-all`}
                                    />
                                    <div className="absolute top-0 right-1 bottom-0 flex items-center pointer-events-none">
                                        <span className="text-[8px] text-gray-600">x</span>
                                    </div>
                                </div>

                                <div className="flex gap-1 ml-auto">
                                    <button
                                        onClick={() => {
                                            setSpeed(1.0);
                                            deck.setSpeed(1.0);
                                        }}
                                        className="text-[9px] px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-gray-400 hover:text-white transition-colors uppercase tracking-wider"
                                    >
                                        RESET
                                    </button>
                                    <button
                                        onClick={handleBrake}
                                        className="text-[9px] bg-red-900/20 text-red-300 px-2 py-0.5 rounded border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors uppercase tracking-wider"
                                    >
                                        BRAKE
                                    </button>
                                </div>
                            </div>

                            <div className="relative h-8 flex items-center group">
                                {/* Glow Background behind slider */}
                                <div className={`absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-${color === 'blue' ? 'blue-500/30' : 'purple-500/30'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-sm`}></div>

                                {/* Track */}
                                <div className="absolute left-0 right-0 h-1 bg-gray-800 rounded-full overflow-hidden">
                                    {/* Center Marker Inside Track */}
                                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 -translate-x-1/2"></div>
                                </div>


                                {/* Range Slider - Transparent Track, Visible Thumb */}
                                <input
                                    type="range"
                                    min="0.5"
                                    max="1.5"
                                    step="0.001"
                                    value={speed}
                                    onChange={handleSpeedChange}
                                    className={`relative z-10 w-full h-8 bg-transparent appearance-none cursor-pointer 
                                        [&::-webkit-slider-thumb]:appearance-none 
                                        [&::-webkit-slider-thumb]:w-4 
                                        [&::-webkit-slider-thumb]:h-4 
                                        [&::-webkit-slider-thumb]:${color === 'blue' ? 'bg-cyan-400' : 'bg-fuchsia-400'} 
                                        [&::-webkit-slider-thumb]:rounded-full 
                                        [&::-webkit-slider-thumb]:border-2 
                                        [&::-webkit-slider-thumb]:border-white 
                                        [&::-webkit-slider-thumb]:shadow-[0_0_15px_currentColor]
                                        [&::-webkit-slider-thumb]:transition-transform
                                        hover:[&::-webkit-slider-thumb]:scale-125
                                        active:[&::-webkit-slider-thumb]:scale-110
                                    `}
                                />
                            </div>
                        </div>

                        {/* LOOP CONTROL */}
                        <div className="flex gap-2 justify-between">
                            <button onClick={() => deck.setLoopIn()} className="flex-1 bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold py-2 rounded hover:bg-white/10 hover:text-white transition-all uppercase">IN</button>
                            <button onClick={() => deck.setLoopOut()} className="flex-1 bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold py-2 rounded hover:bg-white/10 hover:text-white transition-all uppercase">OUT</button>
                            <button onClick={() => deck.exitLoop()} className="flex-1 bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold py-2 rounded hover:bg-white/10 hover:text-white transition-all uppercase">EXIT</button>
                        </div>

                        {/* SAMPLER PADS */}
                        <div>
                            <div className="text-[10px] font-bold text-gray-500 tracking-widest mb-1 text-center">SAMPLER</div>
                            <div className="grid grid-cols-2 gap-2">
                                {[0, 1, 2, 3].map(i => (
                                    <button
                                        key={i}
                                        onClick={() => handleSamplerClick(i)}
                                        onContextMenu={(e) => handleSamplerContextMenu(e, i)}
                                        title={sampleLoaded[i] ? "Left-click to Play, Right-click to Unload" : "Click to load sample"}
                                        className={`h-10 text-[10px] font-bold border rounded transition-all active:scale-95
                                            ${sampleLoaded[i]
                                                ? (color === 'blue' ? 'bg-blue-500/20 border-blue-500 text-blue-200 hover:bg-blue-500/40' : 'bg-purple-500/20 border-purple-500 text-purple-200 hover:bg-purple-500/40')
                                                : 'bg-black/30 border-white/5 text-gray-600 hover:bg-white/5'
                                            }`}
                                    >
                                        {sampleLoaded[i] ? `PAD ${i + 1}` : '+ LOAD'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mixer Strip */}
                <div className="flex-none w-full xl:w-72 flex flex-col gap-6 bg-black/20 rounded-xl p-4 border border-white/5">

                    {/* EQ Section */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2">
                            <div className="text-[10px] font-bold text-gray-500 text-center tracking-widest">GRAPHIC EQ</div>
                            <select
                                onChange={(e) => applyPreset(e.target.value as EQPresetName)}
                                className="bg-black/60 text-[10px] text-neon-blue border border-neon-blue/30 rounded-md px-2 py-1 outline-none focus:border-neon-blue focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all uppercase tracking-wider backdrop-blur-md cursor-pointer hover:bg-black/80 hover:border-neon-blue/50"
                                defaultValue=""
                            >
                                <option value="" disabled>PRESET</option>
                                {Object.keys(EQ_PRESETS).map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-row justify-between items-end h-32 gap-1 pt-2">
                            {bands.map((band, index) => (
                                <div key={band} className="flex flex-col items-center justify-end h-full gap-1 flex-1">
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.1"
                                        value={eqGains[index]}
                                        onChange={(e) => handleEQChange(index, parseFloat(e.target.value))}
                                        // Use style for vertical slider support in WebKit
                                        style={{ WebkitAppearance: 'slider-vertical' }}
                                        className="w-full h-full bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-gray-300 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:bg-gray-300"
                                    />
                                    <div className="text-[8px] uppercase text-gray-500 font-mono -rotate-45 mt-1 origin-top-left translate-x-1">{band}</div>
                                </div>
                            ))}
                        </div>
                    </div>


                    {/* ISOLATOR EQ (3-BAND) */}
                    <div className="space-y-4 border-t border-white/5 pt-6 mt-4">
                        <div className="text-[10px] font-bold text-gray-500 text-center tracking-widest">ISOLATOR</div>
                        <div className="flex flex-row justify-between items-end h-32 gap-2 px-2">
                            {/* LOW, MID, HIGH */}
                            {['low', 'mid', 'high'].map((band) => {
                                const val = isolator[band as 'low' | 'mid' | 'high'];
                                const isKilled = val <= 0.01;
                                return (
                                    <div key={band} className="flex flex-col items-center justify-end h-full gap-2 flex-1 relative group">
                                        {/* Kill Indicator */}
                                        <div className={`text-[8px] font-black uppercase tracking-wider transition-colors ${isKilled ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
                                            {isKilled ? 'KILL' : band.toUpperCase()}
                                        </div>

                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={val}
                                            onChange={(e) => handleIsolatorChange(band as 'low' | 'mid' | 'high', parseFloat(e.target.value))}
                                            style={{ WebkitAppearance: 'slider-vertical' }}
                                            className={`flex-1 min-h-0 w-full bg-transparent appearance-none cursor-pointer 
                                                [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_5px_rgba(0,0,0,0.5)]
                                                ${band === 'low' ? '[&::-webkit-slider-thumb]:bg-red-400' : ''}
                                                ${band === 'mid' ? '[&::-webkit-slider-thumb]:bg-yellow-400' : ''}
                                                ${band === 'high' ? '[&::-webkit-slider-thumb]:bg-cyan-400' : ''}
                                            `}
                                            onDoubleClick={() => handleIsolatorChange(band as 'low' | 'mid' | 'high', 0.5)}
                                        />

                                        {/* Center Detent visual */}
                                        <div className="absolute top-1/2 w-full h-[1px] bg-white/10 pointer-events-none -z-10"></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* FX Section + GATE */}
                    <div className="space-y-4">
                        <div className="text-[10px] font-bold text-neon-blue text-center tracking-widest border-b border-white/5 pb-1">FX & GATE</div>

                        <div className="flex flex-col items-center gap-1">
                            <div className="flex w-full justify-between text-[9px] uppercase text-gray-400 font-mono">
                                <span>Noise Gate</span>
                                <span className={gateThreshold > -50 ? 'text-white' : 'text-gray-600'}>{gateThreshold > -49 ? `${gateThreshold}dB` : 'OFF'}</span>
                            </div>
                            <input
                                type="range"
                                min="-60"
                                max="-10"
                                step="1"
                                value={gateThreshold}
                                onChange={(e) => handleGateChange(parseFloat(e.target.value))}
                                className={`w-full h-1 bg-gray-700 rounded appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                                    ${Number(gateThreshold) > -55 ? ' [&::-webkit-slider-thumb]:bg-red-400' : ' [&::-webkit-slider-thumb]:bg-gray-500'}`}
                            />
                        </div>

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

                {/* SEEK BAR */}
                {inputType === 'file' && duration > 0 && (
                    <div className="w-full flex items-center gap-3">
                        <span className="text-[10px] font-mono text-gray-400 w-8">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            min="0"
                            max={duration}
                            step="0.1"
                            value={currentTime}
                            onChange={handleSeek}
                            className={`flex-1 h-1 bg-gray-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-150 transition-all`}
                        />
                        <span className="text-[10px] font-mono text-gray-400 w-8 text-right">{formatTime(duration)}</span>
                    </div>
                )}

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
