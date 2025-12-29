import { AudioContextManager } from './AudioContextManager';
import { EQ } from './EQ';
import { Reverb } from './Reverb';
import { Delay } from './Delay';

export class Deck {
    private context: AudioContext;
    private gainNode: GainNode;
    private analyserNode: AnalyserNode;
    private eq: EQ;
    public reverb: Reverb;
    public delay: Delay;
    private sourceNode: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;
    private buffer: AudioBuffer | null = null;
    private pausedAt = 0;
    private startedAt = 0;

    // Public output for the mixer to connect to
    public outputNode: GainNode;

    constructor() {
        this.context = AudioContextManager.getInstance().getContext();
        this.gainNode = this.context.createGain();
        this.analyserNode = this.context.createAnalyser();
        this.outputNode = this.context.createGain();
        this.eq = new EQ(this.context);
        this.reverb = new Reverb(this.context);
        this.delay = new Delay(this.context);

        this.setupAudioChain();
    }

    private setupAudioChain() {
        // Chain: EQ Output -> Delay -> Reverb -> Gain -> Analyser -> OutputNode
        // Source will connect to EQ Input
        this.eq.output.connect(this.delay.input);
        this.delay.output.connect(this.reverb.input);
        this.reverb.output.connect(this.gainNode);

        this.gainNode.connect(this.analyserNode);
        this.analyserNode.connect(this.outputNode);

        // Configure Analyser
        this.analyserNode.fftSize = 2048;
    }

    public async load(fileArrayBuffer: ArrayBuffer): Promise<void> {
        this.stop();
        try {
            this.buffer = await this.context.decodeAudioData(fileArrayBuffer);
            this.pausedAt = 0; // Reset on new load
            this.startedAt = 0;
        } catch (error) {
            console.error('Error decoding audio data:', error);
            throw error;
        }
    }

    public async loadStream(stream: MediaStream): Promise<void> {
        this.stop();
        this.buffer = null; // Clear buffer if switching to stream

        this.sourceNode = this.context.createMediaStreamSource(stream);
        this.sourceNode.connect(this.eq.input);
        this.pausedAt = 0;
        this.startedAt = 0;
    }

    public play() {
        if (!this.buffer) return;

        // Stop existing source if any (shouldn't happen if logic is clean, but safe)
        this.stopSource();

        this.sourceNode = this.context.createBufferSource();
        this.sourceNode.buffer = this.buffer;

        // Connect Source -> EQ Input
        this.sourceNode.connect(this.eq.input);

        this.sourceNode.loop = false;

        // Start from paused position
        this.sourceNode.start(0, this.pausedAt);

        // Record relative start time
        this.startedAt = this.context.currentTime - this.pausedAt;
    }

    public pause() {
        if (this.sourceNode) {
            // Calculate elapsed time
            const elapsed = this.context.currentTime - this.startedAt;
            this.pausedAt = elapsed;

            this.stopSource();
        }
    }

    // Completely stop and reset to 0
    public stop() {
        this.stopSource();
        this.pausedAt = 0;
        this.startedAt = 0;
    }

    private stopSource() {
        if (this.sourceNode) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((this.sourceNode as any).stop) (this.sourceNode as any).stop();
                this.sourceNode.disconnect();
            } catch {
                // Ignore errors if already stopped
            }
            this.sourceNode = null;
        }
    }

    public setVolume(value: number) {
        // Value 0.0 to 1.0
        // Use setValueAtTime for smooth transitions to avoid clicks
        this.gainNode.gain.setTargetAtTime(value, this.context.currentTime, 0.01);
    }

    public setEQ(low: number, mid: number, high: number) {
        this.eq.setLow(low);
        this.eq.setMid(mid);
        this.eq.setHigh(high);
    }

    public getAnalyser(): AnalyserNode {
        return this.analyserNode;
    }
}
