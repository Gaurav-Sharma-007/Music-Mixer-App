import { AudioContextManager } from './AudioContextManager';
import { EQ } from './EQ';

export class Deck {
    private context: AudioContext;
    private gainNode: GainNode;
    private analyserNode: AnalyserNode;
    private eq: EQ;
    private sourceNode: AudioBufferSourceNode | null = null;
    private buffer: AudioBuffer | null = null;

    // Public output for the mixer to connect to
    public outputNode: GainNode;

    constructor() {
        this.context = AudioContextManager.getInstance().getContext();
        this.gainNode = this.context.createGain();
        this.analyserNode = this.context.createAnalyser();
        this.outputNode = this.context.createGain();
        this.eq = new EQ(this.context);

        this.setupAudioChain();
    }

    private setupAudioChain() {
        // Chain: EQ Output -> Gain -> Analyser -> OutputNode
        // Source will connect to EQ Input
        this.eq.output.connect(this.gainNode);
        this.gainNode.connect(this.analyserNode);
        this.analyserNode.connect(this.outputNode);

        // Configure Analyser
        this.analyserNode.fftSize = 2048;
    }

    public async load(fileArrayBuffer: ArrayBuffer): Promise<void> {
        this.stop();
        try {
            this.buffer = await this.context.decodeAudioData(fileArrayBuffer);
        } catch (error) {
            console.error('Error decoding audio data:', error);
            throw error;
        }
    }

    public play() {
        if (!this.buffer) return;

        // Stop existing source if any
        this.stop();

        this.sourceNode = this.context.createBufferSource();
        this.sourceNode.buffer = this.buffer;

        // Connect Source -> EQ Input
        this.sourceNode.connect(this.eq.input);

        this.sourceNode.loop = false; // DJ decks usually don't loop by default unless loop mode is on
        this.sourceNode.start(0);
    }

    public stop() {
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
                this.sourceNode.disconnect();
            } catch (e) {
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
