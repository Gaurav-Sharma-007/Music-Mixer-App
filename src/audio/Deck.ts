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


    public setEQGain(bandIndex: number, gain: number) {
        this.eq.setGain(bandIndex, gain);
    }

    public getEQFrequencies(): number[] {
        return this.eq.getFrequencies();
    }

    public getAnalyser(): AnalyserNode {
        return this.analyserNode;
    }

    // --- VINYL SPEED / PITCH ---
    private playbackRate = 1.0;

    public setSpeed(rate: number) {
        this.playbackRate = rate;
        if (this.sourceNode instanceof AudioBufferSourceNode) {
            this.sourceNode.playbackRate.setValueAtTime(
                rate,
                this.context.currentTime
            );
        }
    }

    public brake() {
        if (this.sourceNode instanceof AudioBufferSourceNode) {
            // Ramp down speed to 0 over 1 second (simulating vinyl stop)
            const now = this.context.currentTime;
            this.sourceNode.playbackRate.cancelScheduledValues(now);
            this.sourceNode.playbackRate.setValueAtTime(this.playbackRate, now);
            // Linear ramp to almost 0 (0 causes issues sometimes, use 0.001)
            this.sourceNode.playbackRate.linearRampToValueAtTime(0.001, now + 1.0);

            // Wait for brake to finish then stop logic
            setTimeout(() => {
                this.pause();
                // Restore rate for next play
                this.setSpeed(this.playbackRate);
            }, 1000);
        }
    }

    // --- LOOPING ---
    private loopStartPoint: number | null = null;
    private loopEndPoint: number | null = null;

    public setLoopIn() {
        if (!this.sourceNode || !(this.sourceNode instanceof AudioBufferSourceNode)) return;

        // Simple approximation: time since start + initial offset
        const now = this.context.currentTime;
        // bufferTime is approximately:
        const bufferTime = this.pausedAt + (now - this.startedAt);

        this.loopStartPoint = bufferTime;
        console.log('Loop In set at:', this.loopStartPoint);
    }

    public setLoopOut() {
        if (!this.sourceNode || !(this.sourceNode instanceof AudioBufferSourceNode)) return;
        const now = this.context.currentTime;
        const bufferTime = this.pausedAt + (now - this.startedAt);

        if (this.loopStartPoint !== null && bufferTime > this.loopStartPoint) {
            this.loopEndPoint = bufferTime;
            this.engageLoop();
            console.log('Loop Out set at:', this.loopEndPoint);
        }
    }

    public exitLoop() {
        if (this.sourceNode && this.sourceNode instanceof AudioBufferSourceNode) {
            this.sourceNode.loop = false;
        }
        this.loopStartPoint = null;
        this.loopEndPoint = null;
    }

    private engageLoop() {
        if (this.sourceNode &&
            this.sourceNode instanceof AudioBufferSourceNode &&
            this.loopStartPoint !== null &&
            this.loopEndPoint !== null) {

            this.sourceNode.loopStart = this.loopStartPoint;
            this.sourceNode.loopEnd = this.loopEndPoint;
            this.sourceNode.loop = true;
        }
    }

    // --- SAMPLER ---
    // 4 Slots for samples
    private samples: (AudioBuffer | null)[] = [null, null, null, null];

    public async loadSample(slotIndex: number, fileArrayBuffer: ArrayBuffer) {
        if (slotIndex < 0 || slotIndex > 3) return;
        try {
            const buffer = await this.context.decodeAudioData(fileArrayBuffer);
            this.samples[slotIndex] = buffer;
        } catch (e) {
            console.error('Failed to load sample', e);
        }
    }

    public playSample(slotIndex: number) {
        const buffer = this.samples[slotIndex];
        if (!buffer) return;

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        // Mix into this.outputNode so it goes to the Mixer.
        source.connect(this.outputNode);
        source.start(0);
    }
}
