export class Reverb {
    public input: GainNode;
    public output: GainNode;
    private wetFilter: ConvolverNode;
    private wetGain: GainNode;
    private dryGain: GainNode;

    constructor(context: AudioContext) {
        this.input = context.createGain();
        this.output = context.createGain();
        this.wetFilter = context.createConvolver();
        this.wetGain = context.createGain();
        this.dryGain = context.createGain();

        // Initialize mix
        this.dryGain.gain.value = 1;
        this.wetGain.gain.value = 0;

        // Generate impulse response
        this.wetFilter.buffer = this.buildImpulse(context, 2, 2.0);

        this.connectNodes();
    }

    private connectNodes() {
        // Input -> Dry -> Output
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Input -> Convolver -> Wet -> Output
        this.input.connect(this.wetFilter);
        this.wetFilter.connect(this.wetGain);
        this.wetGain.connect(this.output);
    }

    private buildImpulse(context: AudioContext, seconds: number, decay: number): AudioBuffer {
        const rate = context.sampleRate;
        const length = rate * seconds;
        const impulse = context.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            // Simple exponential decay noise
            const n = i < length ? (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay) : 0;
            left[i] = n;
            right[i] = n;
        }

        return impulse;
    }

    public setMix(value: number) {
        // Value 0 to 1
        const wet = Math.max(0, Math.min(1, value));
        // Simple linear crossfade for now, or maintain dry and add wet
        // Usually Reverb allows full wet. 
        // Let's do: Dry decreases as Wet increases to maintain volume?
        // Or just Additive? Additive is safer for "Send" style, but for Insert style:
        this.wetGain.gain.value = wet;
        this.dryGain.gain.value = 1 - (wet * 0.5); // Slight dry dip
    }
}
