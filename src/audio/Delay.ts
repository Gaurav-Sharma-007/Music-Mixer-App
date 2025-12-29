export class Delay {
    public input: GainNode;
    public output: GainNode;
    private delayNode: DelayNode;
    private feedbackNode: GainNode;
    private wetGain: GainNode;
    private dryGain: GainNode;

    constructor(context: AudioContext) {
        this.input = context.createGain();
        this.output = context.createGain();
        this.delayNode = context.createDelay(5.0); // Max delay 5s
        this.feedbackNode = context.createGain();
        this.wetGain = context.createGain();
        this.dryGain = context.createGain();

        // Defaults
        this.delayNode.delayTime.value = 0.5; // 500ms
        this.feedbackNode.gain.value = 0.4; // 40% feedback
        this.dryGain.gain.value = 1;
        this.wetGain.gain.value = 0; // Off by default

        this.connectNodes();
    }

    private connectNodes() {
        // Input -> Dry -> Output
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Input -> Delay -> Wet -> Output
        this.input.connect(this.delayNode);
        this.delayNode.connect(this.wetGain);
        this.wetGain.connect(this.output);

        // Feedback Loop: Delay -> Feedback -> Delay
        this.delayNode.connect(this.feedbackNode);
        this.feedbackNode.connect(this.delayNode);
    }

    public setMix(value: number) {
        const wet = Math.max(0, Math.min(1, value));
        this.wetGain.gain.value = wet;
        this.dryGain.gain.value = 1 - (wet * 0.2);
    }

    public setTime(value: number) {
        // Value 0 to 1s typically
        this.delayNode.delayTime.setTargetAtTime(value, 0, 0.1);
    }

    public setFeedback(value: number) {
        // Value 0 to 0.9 (avoid infinite feedback loop)
        this.feedbackNode.gain.setTargetAtTime(Math.min(0.9, value), 0, 0.1);
    }
}
