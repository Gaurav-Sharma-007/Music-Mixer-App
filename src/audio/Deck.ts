import { AudioContextManager } from './AudioContextManager';
import { EQ } from './EQ';
import { ThreeBandEQ } from './ThreeBandEQ';
import { Reverb } from './Reverb';
import { Delay } from './Delay';
import { NoiseGate } from './NoiseGate';

export type StemName = 'vocals' | 'drums' | 'bass' | 'other';
export type StemArrayBuffers = Record<StemName, ArrayBuffer>;
export type StemEnabledState = Record<StemName, boolean>;

const STEM_NAMES: StemName[] = ['vocals', 'drums', 'bass', 'other'];
const DEFAULT_STEM_STATE: StemEnabledState = {
    vocals: true,
    drums: true,
    bass: true,
    other: true
};

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
    private stemBuffers: Record<StemName, AudioBuffer> | null = null;
    private stemGainNodes: Record<StemName, GainNode>;
    private stemSourceNodes: Record<StemName, AudioBufferSourceNode | null>;
    private stemEnabled: StemEnabledState = { ...DEFAULT_STEM_STATE };
    private stemDuration = 0;
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
        this.stemGainNodes = this.createStemGainNodes();
        this.stemSourceNodes = this.createEmptyStemSources();

        this.setupAudioChain();
    }

    private createStemGainNodes(): Record<StemName, GainNode> {
        return STEM_NAMES.reduce((nodes, stem) => {
            const gain = this.context.createGain();
            gain.gain.value = this.stemEnabled[stem] ? 1 : 0;
            gain.connect(this.eq.input);
            nodes[stem] = gain;
            return nodes;
        }, {} as Record<StemName, GainNode>);
    }

    private createEmptyStemSources(): Record<StemName, AudioBufferSourceNode | null> {
        return STEM_NAMES.reduce((nodes, stem) => {
            nodes[stem] = null;
            return nodes;
        }, {} as Record<StemName, AudioBufferSourceNode | null>);
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
        this.clearStemBuffers();
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

    public async loadStems(stemArrayBuffers: StemArrayBuffers): Promise<void> {
        const decodedPairs = await Promise.all(
            STEM_NAMES.map(async (stem) => {
                const buffer = await this.context.decodeAudioData(stemArrayBuffers[stem].slice(0));
                return [stem, buffer] as const;
            })
        );

        const wasPlaying = this.isPlaying;
        const currentPosition = Math.min(this.getCurrentTime(), this.getDuration() || Number.POSITIVE_INFINITY);
        this.stopSource();

        this.stemBuffers = decodedPairs.reduce((buffers, [stem, buffer]) => {
            buffers[stem] = buffer;
            return buffers;
        }, {} as Record<StemName, AudioBuffer>);
        this.stemDuration = Math.max(...decodedPairs.map(([, buffer]) => buffer.duration));
        this.pausedAt = Number.isFinite(currentPosition)
            ? Math.min(currentPosition, this.stemDuration)
            : 0;
        this.startedAt = 0;
        this.setStemMix(this.stemEnabled);

        if (wasPlaying) {
            this.play();
        }
    }

    public async loadStream(stream: MediaStream): Promise<void> {
        this.stop();
        this.buffer = null; // Clear buffer if switching to stream
        this.clearStemBuffers();

        this.sourceNode = this.context.createMediaStreamSource(stream);
        this.sourceNode.connect(this.eq.input);
        this.pausedAt = 0;
        this.startedAt = 0;
    }

    private clearStemBuffers() {
        this.stopStemSources();
        this.stemBuffers = null;
        this.stemDuration = 0;
        this.stemEnabled = { ...DEFAULT_STEM_STATE };
        this.setStemMix(this.stemEnabled);
    }

    private hasStemBuffers(): boolean {
        return this.stemBuffers !== null;
    }

    private hasTimeline(): boolean {
        return this.buffer !== null || this.hasStemBuffers();
    }

    private hasActiveStemSources(): boolean {
        return STEM_NAMES.some(stem => this.stemSourceNodes[stem] !== null);
    }

    private getActiveBufferSources(): AudioBufferSourceNode[] {
        const sources: AudioBufferSourceNode[] = [];

        if (this.sourceNode instanceof AudioBufferSourceNode) {
            sources.push(this.sourceNode);
        }

        STEM_NAMES.forEach(stem => {
            const source = this.stemSourceNodes[stem];
            if (source) {
                sources.push(source);
            }
        });

        return sources;
    }

    private clampOffset(buffer: AudioBuffer, time: number): number {
        if (buffer.duration <= 0) return 0;
        return Math.max(0, Math.min(time, Math.max(0, buffer.duration - 0.01)));
    }

    private isLoopReady(): boolean {
        return this.loopStartPoint !== null && this.loopEndPoint !== null && this.loopEndPoint > this.loopStartPoint;
    }

    private stopStemSources() {
        STEM_NAMES.forEach(stem => {
            const source = this.stemSourceNodes[stem];
            if (!source) return;

            try {
                source.stop();
                source.disconnect();
            } catch {
                // Ignore errors if already stopped.
            }

            this.stemSourceNodes[stem] = null;
        });
    }

    public play() {
        if (!this.hasTimeline() && !(this.sourceNode instanceof MediaStreamAudioSourceNode)) return;

        // If it's a stream, it's already connected in loadStream, we just need to verify logic?
        // Actually loadStream connects it. For stream, 'play' mostly just means internal state tracking.
        if (this.sourceNode instanceof MediaStreamAudioSourceNode) {
            this.isPlaying = true;
            return;
        }

        if (this.stemBuffers) {
            this.playStemSources();
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
        this.sourceNode.start(0, this.clampOffset(this.buffer, this.pausedAt));

        // Record relative start time
        this.startedAt = this.context.currentTime - (this.pausedAt / this.playbackRate); // Correct for rate
        this.isPlaying = true;
    }

    private playStemSources() {
        if (!this.stemBuffers) return;

        this.stopSource();
        const startTime = Math.min(this.pausedAt, this.stemDuration);

        STEM_NAMES.forEach(stem => {
            const source = this.context.createBufferSource();
            const buffer = this.stemBuffers?.[stem];
            if (!buffer) return;

            source.buffer = buffer;
            source.playbackRate.value = this.playbackRate;
            source.connect(this.stemGainNodes[stem]);

            if (this.isLoopReady()) {
                source.loopStart = this.loopStartPoint!;
                source.loopEnd = this.loopEndPoint!;
                source.loop = true;
            }

            source.onended = () => {
                if (this.stemSourceNodes[stem] === source) {
                    this.stemSourceNodes[stem] = null;
                }
            };

            source.start(0, this.clampOffset(buffer, startTime));
            this.stemSourceNodes[stem] = source;
        });

        this.startedAt = this.context.currentTime - (startTime / this.playbackRate);
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

        if (this.sourceNode || this.hasActiveStemSources()) {
            // Calculate elapsed time
            // Account for playback rate in time calculation? 
            // Simple approach: AudioContext time flows linearly.
            // If rate was 1.0 mostly:
            const elapsed = (this.context.currentTime - this.startedAt) * this.playbackRate;
            this.pausedAt = Math.min(elapsed, this.getDuration() || elapsed);

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
        this.stopStemSources();

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

    public hasStems(): boolean {
        return this.hasStemBuffers();
    }

    public getStemEnabled(): StemEnabledState {
        return { ...this.stemEnabled };
    }

    public setStemEnabled(stem: StemName, enabled: boolean) {
        this.stemEnabled = {
            ...this.stemEnabled,
            [stem]: enabled
        };

        const targetGain = enabled ? 1 : 0;
        this.stemGainNodes[stem].gain.setTargetAtTime(targetGain, this.context.currentTime, 0.01);
    }

    public setStemMix(nextState: StemEnabledState) {
        STEM_NAMES.forEach(stem => {
            this.setStemEnabled(stem, nextState[stem]);
        });
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
        if (this.stemBuffers) return this.stemDuration;
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
        if (this.isLoopReady() && this.getActiveBufferSources().some(source => source.loop)) {

            const loopDuration = this.loopEndPoint! - this.loopStartPoint!;

            // If we're past the loop end, calculate position within loop
            if (currentTime >= this.loopEndPoint!) {
                // Calculate how far past the loop start we are
                const timeIntoLoop = (currentTime - this.loopStartPoint!) % loopDuration;
                currentTime = this.loopStartPoint! + timeIntoLoop;
            }
        }

        return currentTime;
    }

    public seek(time: number) {
        if (!this.hasTimeline()) return;

        // Clamp time
        time = Math.max(0, Math.min(time, this.getDuration()));

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
            STEM_NAMES.forEach(stem => {
                const source = this.stemSourceNodes[stem];
                if (source) {
                    source.playbackRate.setValueAtTime(rate, now);
                }
            });
        } else {
            // If not playing, just update rate. Current time (pausedAt) stays same.
            this.playbackRate = rate;
            // What if we are paused? pause() sets pausedAt. 
            // play() uses pausedAt. startedAt is re-calced on play().
            // So we don't need to adjust anything else.
        }
    }

    public brake() {
        const sources = this.getActiveBufferSources();
        if (sources.length > 0) {
            // Ramp down speed to 0 over 1 second (simulating vinyl stop)
            const now = this.context.currentTime;
            sources.forEach(source => {
                source.playbackRate.cancelScheduledValues(now);
                source.playbackRate.setValueAtTime(this.playbackRate, now);
                // Linear ramp to almost 0 (0 causes issues sometimes, use 0.001)
                source.playbackRate.linearRampToValueAtTime(0.001, now + 1.0);
            });

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
        if (!this.hasTimeline()) return;

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
        if (!this.hasTimeline()) return;
        const currentTime = this.getCurrentTime();

        if (this.loopStartPoint !== null && currentTime > this.loopStartPoint) {
            this.loopEndPoint = currentTime;
            console.log('Loop Out set at:', this.loopEndPoint);

            // If currently playing, engage the loop immediately
            if (this.sourceNode instanceof AudioBufferSourceNode || this.hasActiveStemSources()) {
                this.engageLoop();
            }
        }
    }

    public exitLoop() {
        // Disable loop on current source if playing
        if (this.sourceNode && this.sourceNode instanceof AudioBufferSourceNode) {
            this.sourceNode.loop = false;
        }
        STEM_NAMES.forEach(stem => {
            const source = this.stemSourceNodes[stem];
            if (source) {
                source.loop = false;
            }
        });
        // Clear loop points so they don't re-engage on next play
        this.loopStartPoint = null;
        this.loopEndPoint = null;
        console.log('Loop exited and cleared');
    }

    private engageLoop() {
        if (!this.isLoopReady()) return;

        const loopStart = this.loopStartPoint!;
        const loopEnd = this.loopEndPoint!;
        this.getActiveBufferSources().forEach(source => {
            source.loopStart = loopStart;
            source.loopEnd = loopEnd;
            source.loop = true;
        });
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
            } catch {
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
