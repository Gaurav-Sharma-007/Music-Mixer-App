
export class NoiseGate {
    private context: AudioContext;
    private inputNode: GainNode;
    private outputNode: GainNode;
    private threshold: number = -50; // dB
    private attack: number = 0.003; // seconds
    private release: number = 0.25; // seconds
    private analyser: AnalyserNode;
    private gateGain: GainNode;
    private isEnabled: boolean = true;

    // Process loop
    private intervalId: number | null = null;

    constructor(context: AudioContext) {
        this.context = context;
        this.inputNode = context.createGain();
        this.outputNode = context.createGain();
        this.gateGain = context.createGain();
        this.analyser = context.createAnalyser();

        // Config Analyser
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.1;

        // Path: Input -> GateGain -> Output
        // Sidechain: Input -> Analyser
        this.inputNode.connect(this.gateGain);
        this.gateGain.connect(this.outputNode);
        this.inputNode.connect(this.analyser);

        this.startProcessing();
    }

    public get input(): GainNode {
        return this.inputNode;
    }

    public get output(): GainNode {
        return this.outputNode;
    }

    public setThreshold(db: number) {
        this.threshold = db;
    }

    public setEnabled(enabled: boolean) {
        this.isEnabled = enabled;
        if (!enabled) {
            // If disabled, let everything through
            this.gateGain.gain.setTargetAtTime(1, this.context.currentTime, 0.01);
        }
    }

    private startProcessing() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const process = () => {
            if (!this.isEnabled) return;

            this.analyser.getByteTimeDomainData(dataArray);

            // Calculate RMS (Root Mean Square) to get average volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                const x = (dataArray[i] - 128) / 128.0;
                sum += x * x;
            }
            const rms = Math.sqrt(sum / bufferLength);

            // Convert to dB
            const db = 20 * Math.log10(rms || 0.0001);

            // Gate Logic
            let targetGain = 1;
            if (db < this.threshold) {
                targetGain = 0;
            }

            // Apply Envelope
            // If opening (0 -> 1), use attack. If closing (1 -> 0), use release.
            const now = this.context.currentTime;

            // Note: simple instantaneous logic is polled here via RAF/interval
            // For AudioWorklet precision it's better, but this is a lightweight JS fallback
            // We use setTargetAtTime to smooth it out

            const timeConstant = targetGain > this.gateGain.gain.value ? this.attack : this.release;
            this.gateGain.gain.setTargetAtTime(targetGain, now, timeConstant);
        };

        // Run at ~60fps
        this.intervalId = window.setInterval(process, 1000 / 60);
    }

    public dispose() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.inputNode.disconnect();
        this.gateGain.disconnect();
        this.analyser.disconnect();
        this.outputNode.disconnect();
    }
}
