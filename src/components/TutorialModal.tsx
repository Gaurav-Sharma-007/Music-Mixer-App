import React from 'react';

interface TutorialModalProps {
    onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8" onClick={onClose}>
            <div
                className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col"
                onClick={e => e.stopPropagation()} // Prevent close on click inside
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-zinc-900/95 sticky top-0 z-10 backdrop-blur">
                    <div>
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple uppercase tracking-widest">
                            BLANCDJ Guide
                        </h2>
                        <p className="text-sm text-gray-400">Application Overview & Controls</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 text-gray-300">

                    {/* Section 1: Intro */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1 h-6 bg-neon-blue rounded-full"></span>
                            Getting Started
                        </h3>
                        <p className="text-sm leading-relaxed">
                            Welcome to <strong>BLANCDJ</strong>. This application is designed for intuitive, touch-friendly music mixing.
                            You have two main Decks (A & B) and a central Mixer to blend your tracks.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section 2: Decks */}
                        <div className="space-y-4 bg-black/20 p-6 rounded-xl border border-white/5">
                            <h3 className="text-md font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-neon-purple rounded-full"></span>
                                Deck Controls
                            </h3>
                            <ul className="space-y-3 text-xs">
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">LOAD</span>
                                    <span>Click the <strong>FILE</strong> button to load a local track (MP3/WAV) or drag & drop audio files directly. Use <strong>EXTERNAL</strong> to route system audio (Youtube, Spotify) into a deck.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">PLAY</span>
                                    <span>Click the vinyl record or press Space (focus dependent) to toggle playback.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">SPEED</span>
                                    <span>Use the Tempo slider to adjust playback speed. Click <strong>RESET</strong> to return to 1.0x. Use <strong>BRAKE</strong> to simulate a vinyl stop.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">LOOP</span>
                                    <span>Set <strong>IN</strong> and <strong>OUT</strong> points to create a loop. Click <strong>EXIT</strong> to resume normal playback.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Section 3: Mixer & EQ */}
                        <div className="space-y-4 bg-black/20 p-6 rounded-xl border border-white/5">
                            <h3 className="text-md font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                                Mixer & EQ
                            </h3>
                            <ul className="space-y-3 text-xs">
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">GRAPHIC EQ</span>
                                    <span>8-Band EQ for detailed frequency shaping. Use <strong>PRESETS</strong> for quick tone changes (Bass Boost, Vocal, etc.).</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">ISOLATOR</span>
                                    <span>3-Band (Low/Mid/High) performance EQ. Turn a knob all the way down to <strong>KILL</strong> (silence) that band completely. Double-click to reset.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">FX & GATE</span>
                                    <span>Adjust Reverb and Delay sends. Use the <strong>Noise Gate</strong> to silence background hiss from external inputs when no music is playing.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section 4: Sampler */}
                        <div className="space-y-4 bg-black/20 p-6 rounded-xl border border-white/5">
                            <h3 className="text-md font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                                Sampler
                            </h3>
                            <ul className="space-y-3 text-xs">
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">LOAD</span>
                                    <span>Click an empty <strong>+ LOAD</strong> pad to assign a sample (one-shot).</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">PLAY</span>
                                    <span>Left-click a loaded pad to trigger the sample immediately.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">UNLOAD</span>
                                    <span><strong>Right-click</strong> any loaded pad to clear it.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Section 5: Queue */}
                        <div className="space-y-4 bg-black/20 p-6 rounded-xl border border-white/5">
                            <h3 className="text-md font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-pink-400 rounded-full"></span>
                                Music Queue
                            </h3>
                            <ul className="space-y-3 text-xs">
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">ACCESS</span>
                                    <span>Click the <strong>QUEUE</strong> button in the bottom-right of the screen to open the sidebar.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">MANAGE</span>
                                    <span>Add tracks via the file picker. Drag and drop items to reorder your setlist.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="font-bold text-white min-w-[60px]">LOAD</span>
                                    <span>Click <strong>LOAD A</strong> or <strong>LOAD B</strong> on any track to instantly send it to a deck.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-4 text-center">
                        <button
                            onClick={onClose}
                            className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-full transition-all uppercase tracking-widest text-xs border border-white/5"
                        >
                            Got it, let's mix!
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default TutorialModal;
