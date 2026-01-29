import { AudioContextManager } from './AudioContextManager';
import { EQ } from './EQ';
import { ThreeBandEQ } from './ThreeBandEQ';
import { Reverb } from './Reverb';
import { Delay } from './Delay';
import { NoiseGate } from './NoiseGate';

export class Deck {
    private context: AudioContext;
    private gainNode: GainNode;
    private analyserNode: AnalyserNode;
    private eq: EQ;
    public threeBandEQ: ThreeBandEQ;
    public reverb: Reverb;
    public delay: Delay;
    public noiseGate: NoiseGate;
    private sourceNode: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;
    private buffer: AudioBuffer | null = null;
    private pausedAt = 0;
    private startedAt = 0;
    private isPlaying = false;

    // Public output for the mixer to connect to
    public outputNode: GainNode;

    constructor() {
        this.context = AudioContextManager.getInstance().getContext();
        this.gainNode = this.context.createGain();
        this.analyserNode = this.context.createAnalyser();
        this.outputNode = this.context.createGain();
        this.eq = new EQ(this.context);
        this.threeBandEQ = new ThreeBandEQ(this.context);
        this.reverb = new Reverb(this.context);
        this.delay = new Delay(this.context);
        this.noiseGate = new NoiseGate(this.context);

        this.setupAudioChain();
    }

    private setupAudioChain() {
        // Chain: EQ Output -> ThreeBandEQ -> NoiseGate -> Delay -> Reverb -> Gain -> Analyser -> OutputNode
        this.eq.output.connect(this.threeBandEQ.input);
        this.threeBandEQ.output.connect(this.noiseGate.input);
        this.noiseGate.output.connect(this.delay.input);
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
            // Disable noise gate for files by default or keep previous setting? 
            // Usually noise gate is for live input.
            // keeping as is, user can toggle.
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
        if (!this.buffer && !(this.sourceNode instanceof MediaStreamAudioSourceNode)) return;

        // If it's a stream, it's already connected in loadStream, we just need to verify logic?
        // Actually loadStream connects it. For stream, 'play' mostly just means internal state tracking.
        if (this.sourceNode instanceof MediaStreamAudioSourceNode) {
            this.isPlaying = true;
            return;
        }

        if (!this.buffer) return;

        // Stop existing source if any
        this.stopSource();

        this.sourceNode = this.context.createBufferSource();
        this.sourceNode.buffer = this.buffer;

        // Connect Source -> EQ Input
        this.sourceNode.connect(this.eq.input);

        this.sourceNode.loop = false;

        // Restore loop points if set
        if (this.loopStartPoint !== null && this.loopEndPoint !== null) {
            this.sourceNode.loopStart = this.loopStartPoint;
            this.sourceNode.loopEnd = this.loopEndPoint;
            this.sourceNode.loop = true;
        }

        // Handle playback rate
        this.sourceNode.playbackRate.value = this.playbackRate;

        // Start from paused position
        this.sourceNode.start(0, this.pausedAt);

        // Record relative start time
        this.startedAt = this.context.currentTime - (this.pausedAt / this.playbackRate); // Correct for rate
        this.isPlaying = true;
    }

    public pause() {
        if (this.sourceNode instanceof MediaStreamAudioSourceNode) {
            this.isPlaying = false;
            // For stream we might want to disconnect or mute?
            // current logic in loadStream connects it strictly. 
            // In DeckControls we call stop() for external which disconnects.
            return;
        }

        if (this.sourceNode) {
            // Calculate elapsed time
            // Account for playback rate in time calculation? 
            // Simple approach: AudioContext time flows linearly.
            // If rate was 1.0 mostly:
            const elapsed = (this.context.currentTime - this.startedAt) * this.playbackRate;
            this.pausedAt = elapsed;

            this.stopSource();
        }
        this.isPlaying = false;
    }

    // Completely stop and reset to 0
    public stop() {
        this.stopSource();
        this.pausedAt = 0;
        this.startedAt = 0;
        this.isPlaying = false;
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

    public setIsolatorGain(band: 'low' | 'mid' | 'high', value: number) {
        this.threeBandEQ.setGain(band, value);
    }

    public getAnalyser(): AnalyserNode {
        return this.analyserNode;
    }

    // --- SEEKING ---
    public getDuration(): number {
        return this.buffer ? this.buffer.duration : 0;
    }

    public getCurrentTime(): number {
        if (!this.isPlaying) return this.pausedAt;

        // Approximation for UI
        if (this.sourceNode instanceof MediaStreamAudioSourceNode) return 0;

        const now = this.context.currentTime;
        // Correct calculation: startedAt is the context time when track started from 0
        // But we update startedAt on play() to handle offset
        // startedAt = now - (pausedAt / rate)
        // so current "track time" = (now - startedAt) * rate
        let currentTime = (now - this.startedAt) * this.playbackRate;

        // If loop is active, wrap the time within the loop range
        if (this.loopStartPoint !== null && this.loopEndPoint !== null &&
            this.sourceNode && this.sourceNode instanceof AudioBufferSourceNode &&
            this.sourceNode.loop) {

            const loopDuration = this.loopEndPoint - this.loopStartPoint;

            // If we're past the loop end, calculate position within loop
            if (currentTime >= this.loopEndPoint) {
                // Calculate how far past the loop start we are
                const timeIntoLoop = (currentTime - this.loopStartPoint) % loopDuration;
                currentTime = this.loopStartPoint + timeIntoLoop;
            }
        }

        return currentTime;
    }

    public seek(time: number) {
        if (!this.buffer) return;

        // Clamp time
        time = Math.max(0, Math.min(time, this.buffer.duration));

        const wasPlaying = this.isPlaying;

        // If playing, we need to stop and restart at new time
        if (this.isPlaying) {
            this.stopSource();
        }

        this.pausedAt = time;

        if (wasPlaying) {
            this.play();
        }
    }


    // --- VINYL SPEED / PITCH ---
    private playbackRate = 1.0;

    public setSpeed(rate: number) {
        if (this.isPlaying) {
            const now = this.context.currentTime;
            // Configured to ensure seek/time doesn't jump
            const currentTrackTime = (now - this.startedAt) * this.playbackRate;

            this.playbackRate = rate;

            // Recalculate startedAt so that (now - startedAt) * newRate = currentTrackTime
            // startedAt = now - (currentTrackTime / newRate)
            this.startedAt = now - (currentTrackTime / rate);

            if (this.sourceNode instanceof AudioBufferSourceNode) {
                this.sourceNode.playbackRate.setValueAtTime(rate, now);
            }
        } else {
            // If not playing, just update rate. Current time (pausedAt) stays same.
            this.playbackRate = rate;
            // What if we are paused? pause() sets pausedAt. 
            // play() uses pausedAt. startedAt is re-calced on play().
            // So we don't need to adjust anything else.
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
        // Allow setting loop points even when paused
        if (!this.buffer) return;

        const currentTime = this.getCurrentTime();
        this.loopStartPoint = currentTime;
        console.log('Loop In set at:', this.loopStartPoint);

        // If currently playing, engage the loop immediately
        if (this.sourceNode && this.sourceNode instanceof AudioBufferSourceNode) {
            // Just set the start point, wait for OUT to engage full loop
        }
    }

    public setLoopOut() {
        // Allow setting loop points even when paused
        if (!this.buffer) return;
        const currentTime = this.getCurrentTime();

        if (this.loopStartPoint !== null && currentTime > this.loopStartPoint) {
            this.loopEndPoint = currentTime;
            console.log('Loop Out set at:', this.loopEndPoint);

            // If currently playing, engage the loop immediately
            if (this.sourceNode && this.sourceNode instanceof AudioBufferSourceNode) {
                this.engageLoop();
            }
        }
    }

    public exitLoop() {
        // Disable loop on current source if playing
        if (this.sourceNode && this.sourceNode instanceof AudioBufferSourceNode) {
            this.sourceNode.loop = false;
        }
        // Clear loop points so they don't re-engage on next play
        this.loopStartPoint = null;
        this.loopEndPoint = null;
        console.log('Loop exited and cleared');
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
    // Track active source nodes for each sample slot to allow stopping them on unload
    private activeSampleNodes: Set<AudioBufferSourceNode>[] = [new Set(), new Set(), new Set(), new Set()];

    public async loadSample(slotIndex: number, fileArrayBuffer: ArrayBuffer) {
        if (slotIndex < 0 || slotIndex > 3) return;
        try {
            const buffer = await this.context.decodeAudioData(fileArrayBuffer);
            this.samples[slotIndex] = buffer;
        } catch (e) {
            console.error('Failed to load sample', e);
        }
    }

    public unloadSample(slotIndex: number) {
        if (slotIndex < 0 || slotIndex > 3) return;

        // Stop all currently playing instances of this sample
        this.activeSampleNodes[slotIndex].forEach(node => {
            try {
                node.stop();
                node.disconnect();
            } catch (e) {
                // Ignore errors if already stopped
            }
        });
        this.activeSampleNodes[slotIndex].clear();

        this.samples[slotIndex] = null;
    }

    public playSample(slotIndex: number) {
        const buffer = this.samples[slotIndex];
        if (!buffer) return;

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        // Mix into this.outputNode so it goes to the Mixer.
        source.connect(this.outputNode);

        // Track this node
        this.activeSampleNodes[slotIndex].add(source);
        source.onended = () => {
            this.activeSampleNodes[slotIndex].delete(source);
        };

        source.start(0);
    }
}
