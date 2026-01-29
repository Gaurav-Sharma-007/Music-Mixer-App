import React, { useEffect, useRef, useState } from 'react';
import logo from './assets/logo.png';
import { THEMES, applyTheme, loadCustomThemes, deleteCustomTheme, type Theme } from './themes/themeConfig';
import { Deck } from './audio/Deck';
import { Crossfader } from './audio/Crossfader';
import { AudioContextManager } from './audio/AudioContextManager';
import DeckControls from './components/DeckControls';
import Mixer from './components/Mixer';
import AnimatedBackground from './components/AnimatedBackground';
import { AudioRouter } from './components/AudioRouter';
import { useAudioRouter } from './hooks/useAudioRouter';
import { useMusicQueue } from './hooks/useMusicQueue';
import QueuePanel from './components/QueuePanel';
import TutorialModal from './components/TutorialModal';
import ThemeCreator from './components/ThemeCreator';

const App: React.FC = () => {
  const [started, setStarted] = useState(false);
  const [showRouter, setShowRouter] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showThemeCreator, setShowThemeCreator] = useState(false);
  const [themeToEdit, setThemeToEdit] = useState<Theme | null>(null);

  const [customThemes, setCustomThemes] = useState<Theme[]>([]);
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);

  // Load Custom Themes on Mount
  useEffect(() => {
    const loaded = loadCustomThemes();
    setCustomThemes(loaded);
  }, []);

  // Apply Theme on Change
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Queue Hook
  const { queue, addToQueue, addYoutubeToQueue, removeFromQueue, clearQueue, moveItem } = useMusicQueue();

  // External Load Triggers
  const [externalLoadA, setExternalLoadA] = useState<{ file: File; ts: number } | null>(null);
  const [externalLoadB, setExternalLoadB] = useState<{ file: File; ts: number } | null>(null);
  const [externalYoutubeLoadA, setExternalYoutubeLoadA] = useState<{ url: string; ts: number; buffer?: ArrayBuffer; title?: string } | null>(null);
  const [externalYoutubeLoadB, setExternalYoutubeLoadB] = useState<{ url: string; ts: number; buffer?: ArrayBuffer; title?: string } | null>(null);

  const handleLoadFromQueue = (file: File, deckId: 'A' | 'B') => {
    if (deckId === 'A') {
      setExternalLoadA({ file, ts: Date.now() });
    } else {
      setExternalLoadB({ file, ts: Date.now() });
    }
  };

  const handleLoadYoutubeFromQueue = (url: string, deckId: 'A' | 'B', preloadedBuffer?: ArrayBuffer, title?: string) => {
    if (deckId === 'A') {
      setExternalYoutubeLoadA({ url, ts: Date.now(), buffer: preloadedBuffer, title });
    } else {
      setExternalYoutubeLoadB({ url, ts: Date.now(), buffer: preloadedBuffer, title });
    }
  };

  // Use state to persist and trigger renders for audio instances
  const [deckA] = useState(() => new Deck());
  const [deckB] = useState(() => new Deck());
  const [crossfader] = useState(() => new Crossfader());

  // Local gain still needs ref as it's not a render dependency but an audio graph node
  const localGainRef = useRef<GainNode | null>(null);

  const [localMuted, setLocalMuted] = useState(false);
  const [mainStream, setMainStream] = useState<MediaStream | null>(null);

  // Hoisted Audio Router State
  const {
    isCapturing,
    devices,
    selectedDeviceIds,
    setSourceStream,
    toggleDevice,
    refreshDevices
  } = useAudioRouter();

  // Sync Main Stream to Router
  useEffect(() => {
    setSourceStream(mainStream);
  }, [mainStream, setSourceStream]);

  // Auto-mute local when routing is strictly active (User Request Fix)
  useEffect(() => {
    if (selectedDeviceIds.size > 0) {
      setLocalMuted(true);
    }
  }, [selectedDeviceIds.size]);


  useEffect(() => {
    // Initialize Audio Graph
    const ctx = AudioContextManager.getInstance().getContext();

    // Connect Decks to Crossfader
    deckA.outputNode.connect(crossfader.inputA);
    deckB.outputNode.connect(crossfader.inputB);

    // Create Routing Logic
    // 1. Local Output Path: Crossfader -> LocalGain -> Destination
    const localGain = ctx.createGain();
    localGain.gain.value = 1; // Unmuted by default
    crossfader.output.connect(localGain);
    localGain.connect(ctx.destination);

    // 2. Stream Output Path: Crossfader -> MediaStreamDestination
    const streamDest = ctx.createMediaStreamDestination();
    crossfader.output.connect(streamDest);

    // Store refs
    localGainRef.current = localGain;

    // Set Stream State
    setMainStream(streamDest.stream);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckA, deckB, crossfader]);

  // Handle Local Muting
  useEffect(() => {
    if (localGainRef.current) {
      const ctx = AudioContextManager.getInstance().getContext();
      const targetGain = localMuted ? 0 : 1;
      localGainRef.current.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.05);
    }
  }, [localMuted]);

  // Auto-Queue Logic: Load next track when deck finishes
  const handleDeckAEnd = () => {
    const nextItem = queue.find(item => item.targetDeck === 'A');
    if (nextItem) {
      if (nextItem.type === 'file' && nextItem.file) {
        handleLoadFromQueue(nextItem.file, 'A');
      } else if (nextItem.type === 'youtube' && nextItem.youtubeUrl) {
        handleLoadYoutubeFromQueue(nextItem.youtubeUrl, 'A', nextItem.preloadedBuffer, nextItem.name);
      }
      removeFromQueue(nextItem.id);
    }
  };

  const handleDeckBEnd = () => {
    const nextItem = queue.find(item => item.targetDeck === 'B');
    if (nextItem) {
      if (nextItem.type === 'file' && nextItem.file) {
        handleLoadFromQueue(nextItem.file, 'B');
      } else if (nextItem.type === 'youtube' && nextItem.youtubeUrl) {
        handleLoadYoutubeFromQueue(nextItem.youtubeUrl, 'B', nextItem.preloadedBuffer, nextItem.name);
      }
      removeFromQueue(nextItem.id);
    }
  };

  const handleStart = async () => {
    const cm = AudioContextManager.getInstance();
    await cm.resumeContext();
    setStarted(true);
  };

  // Audio Router Overlay Render
  const renderRouter = () => (
    <div className="absolute top-20 right-6 z-50 w-full max-w-md animate-fade-in-up">
      <div className="relative">
        <button
          onClick={() => setShowRouter(false)}
          className="absolute -top-3 -right-3 w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white shadow-lg border border-gray-600 z-10"
        >
          ✕
        </button>
        <AudioRouter
          isCapturing={isCapturing}
          devices={devices}
          selectedDeviceIds={selectedDeviceIds}
          toggleDevice={toggleDevice}
          refreshDevices={refreshDevices}
        />
      </div>
    </div>
  );

  if (!started) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
        <AnimatedBackground themeName={currentTheme.name} customVideo={currentTheme.customVideo} />

        <div className="z-10 text-center p-12 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl animate-fade-in-up">
          <h1 className="text-6xl font-black mb-8 tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 drop-shadow-lg">
            BLANCDJ
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
          <p className="mt-6 text-xs text-gray-500 font-mono">Looping is a BETA feature</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex flex-col font-sans relative">
      <AnimatedBackground themeName={currentTheme.name} customVideo={currentTheme.customVideo} />

      <header className="flex-none p-6 flex justify-between items-center z-10 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Flux DJ Logo" className="h-10 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-mono text-gray-500 border border-white/10 px-2 py-1 rounded-sm bg-black/20">
            Ctx: {AudioContextManager.getInstance().getContext().state}
          </div>
          {started && (
            <>
              <button
                onClick={() => {
                  const ctx = AudioContextManager.getInstance().getContext();
                  console.log('Playing test tone, ctx state:', ctx.state);
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.frequency.setValueAtTime(440, ctx.currentTime);
                  gain.gain.setValueAtTime(0.2, ctx.currentTime);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.3);
                }}
                className="px-3 py-1.5 bg-yellow-600/20 text-yellow-500 rounded text-xs hover:bg-yellow-600/40 border border-yellow-600/30"
              >
                Test Beep
              </button>

              <button
                onClick={() => setLocalMuted(!localMuted)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${localMuted
                  ? 'bg-red-500/20 border-red-500/50 text-red-200 hover:bg-red-500/30'
                  : 'bg-green-500/20 border-green-500/50 text-green-200 hover:bg-green-500/30'
                  }`}
                title="Mute local speakers (prevent double audio when routing)"
              >
                {localMuted ? '🔇 Muted' : '🔊 On'}
              </button>

              <button
                onClick={() => setShowRouter(!showRouter)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition"
              >
                Router
              </button>

              <button
                onClick={() => setShowTutorial(true)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-lg text-sm font-medium transition border border-white/5"
              >
                Tutorial
              </button>

              <button
                onClick={() => setShowQueue(!showQueue)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${showQueue ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                  }`}
              >
                Queue
              </button>
            </>
          )}
          <div className="text-xs font-mono text-gray-500 border border-white/10 px-3 py-1 rounded-full bg-white/5">
            READY TO MIX
          </div>

          {/* Theme Selector Area */}
          <div className="flex items-center gap-2">
            <select
              value={currentTheme.name}
              onChange={(e) => {
                // Determine if it's a default or custom theme
                const allThemes = [...THEMES, ...customThemes];
                const selected = allThemes.find(t => t.name === e.target.value);
                if (selected) setCurrentTheme(selected);
              }}
              className="bg-black/40 text-xs text-gray-400 border border-white/10 rounded px-2 py-1 outline-none hover:text-white transition-colors cursor-pointer max-w-[120px]"
            >
              <optgroup label="Default Themes">
                {THEMES.map(t => (
                  <option key={t.name} value={t.name} className="bg-black text-white">{t.label}</option>
                ))}
              </optgroup>
              {customThemes.length > 0 && (
                <optgroup label="Custom Themes">
                  {customThemes.map(t => (
                    <option key={t.name} value={t.name} className="bg-black text-white">{t.label}</option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Edit Custom Theme Button */}
            {currentTheme.isCustom && (
              <button
                onClick={() => {
                  setThemeToEdit(currentTheme);
                  setShowThemeCreator(true);
                }}
                className="w-6 h-6 flex items-center justify-center bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded border border-blue-500/20 transition-colors mr-1"
                title="Edit Custom Theme"
              >
                ✎
              </button>
            )}



            {/* Delete Custom Theme Button */}
            {currentTheme.isCustom && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete the theme "${currentTheme.label}"?`)) {
                    deleteCustomTheme(currentTheme.name);
                    setCustomThemes(prev => prev.filter(t => t.name !== currentTheme.name));
                    setCurrentTheme(THEMES[0]); // Reset to default
                  }
                }}
                className="w-6 h-6 flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded border border-red-500/20 transition-colors"
                title="Delete Custom Theme"
              >
                ✕
              </button>
            )}

            {/* Create New Theme Button */}
            <button
              onClick={() => setShowThemeCreator(true)}
              className="w-6 h-6 flex items-center justify-center bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white rounded border border-white/10 transition-colors"
              title="Create Custom Theme"
            >
              +
            </button>
          </div>
        </div>
      </header>

      {/* Audio Router Overlay */}
      {showRouter && renderRouter()}

      {/* Main Workspace */}
      <div className="flex-grow flex relative overflow-hidden z-10">
        <main className={`flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 p-6 lg:p-12 relative transition-all duration-300 ${showQueue ? 'mr-80' : ''}`}>

          {/* DECK A */}
          {deckA && (
            <div className="flex-1 w-full max-w-2xl transform transition-all duration-500 hover:scale-[1.01]">
              <DeckControls
                deck={deckA}
                title="DECK A"
                color="blue"
                externalLoad={externalLoadA}
                externalYoutubeLoad={externalYoutubeLoadA}
                onTrackEnd={handleDeckAEnd}
              />
            </div>
          )}

          {/* MIXER */}
          {crossfader && deckA && deckB && (
            <div className="flex-none w-full lg:w-auto lg:min-w-[280px] z-30 flex items-center justify-center pointer-events-none lg:pointer-events-auto my-4 lg:my-0">
              <div className="w-full max-w-sm pointer-events-auto p-6 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] h-auto min-h-[500px] flex flex-col justify-between">
                <Mixer crossfader={crossfader} deckA={deckA} deckB={deckB} />
              </div>
            </div>
          )}

          {/* DECK B */}
          {deckB && (
            <div className="flex-1 w-full max-w-2xl transform transition-all duration-500 hover:scale-[1.01]">
              <DeckControls
                deck={deckB}
                title="DECK B"
                color="purple"
                externalLoad={externalLoadB}
                externalYoutubeLoad={externalYoutubeLoadB}
                onTrackEnd={handleDeckBEnd}
              />
            </div>
          )}
        </main>

        {/* Queue Panel Sidebar - Fixed on Right */}
        <div className={`fixed inset-y-0 right-0 z-40 w-80 transform transition-transform duration-300 ease-in-out ${showQueue ? 'translate-x-0' : 'translate-x-full'} pt-20 shadow-2xl bg-zinc-900 border-l border-white/10`}>
          <QueuePanel
            queue={queue}
            addToQueue={addToQueue}
            addYoutubeToQueue={addYoutubeToQueue}
            removeFromQueue={removeFromQueue}
            clearQueue={clearQueue}
            moveItem={moveItem}
            onLoadToDeck={handleLoadFromQueue}
            onLoadYoutubeToDeck={handleLoadYoutubeFromQueue}
            onClose={() => setShowQueue(false)}
          />
        </div>
      </div>

      <footer className="flex-none py-4 text-center text-gray-600 text-xs font-mono z-10 border-t border-white/5 bg-black/40 backdrop-blur-sm">
        Web Audio API • High Fidelity Audio Engine
      </footer>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}

      {showThemeCreator && (
        <ThemeCreator
          initialTheme={themeToEdit || undefined}
          onClose={() => {
            setShowThemeCreator(false);
            setThemeToEdit(null);
          }}
          onSave={(newTheme) => {
            setCustomThemes(prev => {
              // If editing existing, replace it. Else add new.
              const index = prev.findIndex(t => t.name === newTheme.name);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = newTheme;
                return updated;
              }
              return [...prev, newTheme];
            });
            setCurrentTheme(newTheme);
            setThemeToEdit(null);
          }}
        />
      )}


    </div>
  );
};


export default App;
