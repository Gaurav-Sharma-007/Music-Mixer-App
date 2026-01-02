import { AudioContextManager } from './AudioContextManager';

export class Crossfader {
    private context: AudioContext;
    public inputA: GainNode;
    public inputB: GainNode;
    public output: GainNode;

    constructor() {
        this.context = AudioContextManager.getInstance().getContext();
        this.inputA = this.context.createGain();
        this.inputB = this.context.createGain();
        this.output = this.context.createGain();

        // Connect inputs to master output
        this.inputA.connect(this.output);
        this.inputB.connect(this.output);

        // Connect Output to Master Bus
        this.output.connect(AudioContextManager.getInstance().getMasterGain());


        // Initialize at center (0.5)
        this.setFaderPosition(0.5);
    }

    /**
     * Sets the crossfader position.
     * @param value 0.0 (Left/A) to 1.0 (Right/B)
     */
    public setFaderPosition(value: number) {
        // Clamp value
        const val = Math.max(0, Math.min(1, value));

        // Equal Power Crossfade
        // A: cos(val * pi/2)
        // B: cos((1-val) * pi/2) -> equiv to sin(val * pi/2)

        const gainA = Math.cos(val * 0.5 * Math.PI);
        const gainB = Math.cos((1 - val) * 0.5 * Math.PI);

        this.inputA.gain.setTargetAtTime(gainA, this.context.currentTime, 0.01);
        this.inputB.gain.setTargetAtTime(gainB, this.context.currentTime, 0.01);
    }
}
