export class AudioContextManager {
    private static instance: AudioContextManager;
    private audioContext: AudioContext;
    private masterGain: GainNode;
    private masterAnalyser: AnalyserNode;

    private constructor() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
            latencyHint: 'interactive',
            sampleRate: 44100 // Standardize sample rate to minimize resampling artifacts
        });

        // Create Master Bus
        this.masterGain = this.audioContext.createGain();
        this.masterAnalyser = this.audioContext.createAnalyser();

        // Connect Master -> Analyser -> Destination
        this.masterGain.connect(this.masterAnalyser);
        this.masterAnalyser.connect(this.audioContext.destination);

        // Config Analyser
        this.masterAnalyser.fftSize = 2048;
    }

    public static getInstance(): AudioContextManager {
        if (!AudioContextManager.instance) {
            AudioContextManager.instance = new AudioContextManager();
        }
        return AudioContextManager.instance;
    }

    public getContext(): AudioContext {
        return this.audioContext;
    }

    public getMasterGain(): GainNode {
        return this.masterGain;
    }

    public getMasterAnalyser(): AnalyserNode {
        return this.masterAnalyser;
    }

    public async resumeContext(): Promise<void> {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
}
