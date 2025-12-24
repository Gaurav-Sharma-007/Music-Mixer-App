import React, { useEffect, useRef, useState } from 'react';
import { Deck } from './audio/Deck';
import { Crossfader } from './audio/Crossfader';
import { AudioContextManager } from './audio/AudioContextManager';
import DeckControls from './components/DeckControls';
import Mixer from './components/Mixer';
import AnimatedBackground from './components/AnimatedBackground';

const App: React.FC = () => {
  const [started, setStarted] = useState(false);

  // Use refs to persist audio instances across renders
  const deckARef = useRef<Deck | null>(null);
  const deckBRef = useRef<Deck | null>(null);
  const crossfaderRef = useRef<Crossfader | null>(null);

  useEffect(() => {
    // Initialize Audio Engine
    const deckA = new Deck();
    const deckB = new Deck();
    const crossfader = new Crossfader();

    // Connect Decks to Crossfader
    // DeckA -> Crossfader Input A
    deckA.outputNode.connect(crossfader.inputA);
    // DeckB -> Crossfader Input B
    deckB.outputNode.connect(crossfader.inputB);

    deckARef.current = deckA;
    deckBRef.current = deckB;
    crossfaderRef.current = crossfader;

    return () => {
      // Cleanup if needed (rare for App)
      // Usually disconnect nodes, close context if single page app navigates away
    };
  }, []);

  const handleStart = async () => {
    const cm = AudioContextManager.getInstance();
    await cm.resumeContext();
    setStarted(true);
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
        <AnimatedBackground />

        <div className="z-10 text-center p-12 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl animate-fade-in-up">
          <h1 className="text-6xl font-bold mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 drop-shadow-lg">
            FLUX DJ
          </h1>
          <p className="text-gray-400 mb-8 font-light tracking-widest text-sm uppercase">Professional Web Audio Interface</p>

          <button
            onClick={handleStart}
            className="group relative px-10 py-5 bg-transparent overflow-hidden rounded-md transition-all duration-300"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-neon-blue to-neon-purple opacity-80 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-neon-blue to-neon-purple blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
            <span className="relative z-10 text-xl font-bold tracking-widest text-white group-hover:scale-105 transition-transform inline-block">
              ENTER STUDIO
            </span>
          </button>
          <p className="mt-6 text-xs text-gray-500 font-mono">AudioContext requires user gesture</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex flex-col font-sans relative">
      <AnimatedBackground />

      {/* Header */}
      <header className="flex-none p-6 flex justify-between items-center z-10 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neon-blue to-neon-purple animate-pulse-slow"></div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            FLUX <span className="font-light text-gray-400">DJ</span>
          </h1>
        </div>
        <div className="text-xs font-mono text-gray-500 border border-white/10 px-3 py-1 rounded-full bg-white/5">
          READY TO MIX
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-grow flex flex-col lg:flex-row items-center justify-center gap-6 p-6 lg:p-12 relative z-10">

        {/* DECK A */}
        {deckARef.current && (
          <div className="flex-1 w-full max-w-2xl transform transition-all duration-500 hover:scale-[1.01]">
            <DeckControls deck={deckARef.current} title="DECK A" color="blue" />
          </div>
        )}

        {/* MIXER */}
        {crossfaderRef.current && (
          <div className="flex-none w-full lg:w-32 flex items-center justify-center z-20">
            <div className="p-6 bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl h-full lg:h-[500px] flex flex-col justify-center">
              <Mixer crossfader={crossfaderRef.current} />
            </div>
          </div>
        )}

        {/* DECK B */}
        {deckBRef.current && (
          <div className="flex-1 w-full max-w-2xl transform transition-all duration-500 hover:scale-[1.01]">
            <DeckControls deck={deckBRef.current} title="DECK B" color="purple" />
          </div>
        )}
      </main>

      <footer className="flex-none py-4 text-center text-gray-600 text-xs font-mono z-10 border-t border-white/5 bg-black/40 backdrop-blur-sm">
        Web Audio API • High Fidelity Audio Engine
      </footer>
    </div>
  );
};

export default App;
