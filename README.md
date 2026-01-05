# BLANCDJ - Professional Web Audio Interface

**BLANCDJ** is a high-performance, touch-friendly DJ mixing application built with React, TypeScript, and the Web Audio API, wrapped in Electron for a native desktop experience. It features dual decks, professional-grade EQ and effects, a sampler, and advanced audio routing capabilities.

![BLANCDJ Logo](/logo.png)

## 🚀 Key Features

### 🎛️ Dual Deck System
- **Precision Playback**: Variable playback speed (Tempo) with vinyl-style pitch shifting.
- **Waveform Visualization**: Real-time visual feedback of audio data.
- **Looping**: Manual Loop In/Out points with seamless looping and exit controls.
- **Vinyl Physics**: "Brake" effect simulates a turntable stopping.
- **Format Support**: MP3, WAV, OGG, and local file drag-and-drop.

### 🎧 Professional Mixer
- **Crossfader**: Smooth blending between Deck A and Deck B with custom curves.
- **3-Band Isolator EQ**: Performance-ready Low, Mid, and High knobs with "Kill" capability (-infinity dB) for dramatic frequency cuts.
- **8-Band Graphic EQ**: Fine-tune the master output tone with presets (Bass Boost, Vocal, Flat, etc.).
- **VU Meters**: Real-time stereo visualization of audio levels.

### 🎚️ Effects & Processing
- **Noise Gate**: Adjustable threshold to eliminate background hiss from external inputs.
- **Reverb**: Room simulation effect for adding space to the mix.
- **Delay**: Echo/Delay effect for creative transitions.

### 🎹 Sampler
- **4-Pad Bank**: Load one-shot samples (drums, FX, vocals) for instant triggering.
- **Hot-Swap**: Click `+ LOAD` to assign samples.
- **Quick Unload**: Right-click any pad to clear the slot.

### 🔌 External Input & Routing
- **System Audio Capture**: Route audio from other apps (Spotify, YouTube, Browser) directly into a Deck for mixing.
- **Multi-Output Routing**: Send the Master output to multiple audio devices simultaneously (e.g., Local Speakers + Bluetooth Device) via the built-in Audio Router.

### 📂 Music Management
- **Integrated Queue**: Sidebar playlist management.
- **Drag & Drop**: Easily reorder tracks or add new files.
- **Instant Load**: One-click loading to Deck A or Deck B.

## 🛠️ Technology Stack

- **Core**: [React](https://reactjs.org/) (v18), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Desktop Shell**: [Electron](https://www.electronjs.org/)
- **Audio Engine**: Native **Web Audio API** (AudioContext, BiquadFilterNode, AudioWorklet)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Visuals**: Canvas API for waveforms and spectrum analysis.

## 📦 Installation

Prerequisites: Node.js (v16+) and npm/yarn.

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/blancdj.git
    cd blancdj
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

## 🏃‍♂️ Usage

### Development Mode
Run the React dev server and Electron wrapper simultaneously:
```bash
npm run dev:electron
```

### Production Build
Create a distributable executable for your OS:
```bash
npm run build
```
The output will be in the `dist` or `release` directory.

## 🏗️ Project Architecture

```
src/
├── audio/              # Core Audio Engine Logic
│   ├── AudioContextManager.ts  # Singleton AudioContext
│   ├── Deck.ts                 # Individual Deck logic (Play, Speed, FX)
│   ├── ThreeBandEQ.ts          # Isolator EQ Class
│   └── Crossfader.ts           # Mixing Logic
├── components/         # React UI Components
│   ├── DeckControls.tsx        # Deck UI (Sliders, Buttons)
│   ├── Mixer.tsx               # Central Mixer UI
│   ├── QueuePanel.tsx          # Playlist/Queue Sidebar
│   └── TutorialModal.tsx       # Built-in User Guide
├── hooks/              # Custom React Hooks
│   ├── useAudioRouter.ts       # Audio Output Device Management
│   └── useMusicQueue.ts        # Queue State Logic
└── App.tsx             # Main Entry & Layout
```

## 🎮 Controls Quick Guide

| Action | Control |
| :--- | :--- |
| **Play/Pause** | Click Vinyl Record / Spacebar |
| **Load Track** | "FILE" Button or Drag & Drop |
| **Tempo** | Vertical Slider (Right) |
| **Loop** | IN -> OUT to set, EXIT to release |
| **Isolator** | Low/Mid/High Knobs (Bottom creates Silence) |
| **Unload Sample** | Right-Click Pad |
| **Tutorial** | Click "TUTORIAL" in Top Ribbon |

## 🤝 Contributing

1.  Fork the Project.
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your Changes.
4.  Push to the Branch.
5.  Open a Pull Request.

---

**BLANCDJ** - *Defined by Sound.*
