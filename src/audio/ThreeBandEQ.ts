export class ThreeBandEQ {
    public input: GainNode;
    public output: GainNode;

    private lowFilter: BiquadFilterNode;
    private midFilter: BiquadFilterNode;
    private highFilter: BiquadFilterNode;

    constructor(context: AudioContext) {
        this.input = context.createGain();
        this.output = context.createGain();

        // Initialize Filters
        this.lowFilter = context.createBiquadFilter();
        this.midFilter = context.createBiquadFilter();
        this.highFilter = context.createBiquadFilter();

        this.setupFilters();
        this.connectNodes();
    }

    private setupFilters() {
        // Low: Low Shelf @ 250Hz
        this.lowFilter.type = 'lowshelf';
        this.lowFilter.frequency.value = 250;
        this.lowFilter.gain.value = 0;

        // Mid: Peaking @ 1000Hz, Wide Q
        this.midFilter.type = 'peaking';
        this.midFilter.frequency.value = 1000;
        this.midFilter.Q.value = 1.0;
        this.midFilter.gain.value = 0;

        // High: High Shelf @ 4000Hz
        this.highFilter.type = 'highshelf';
        this.highFilter.frequency.value = 4000;
        this.highFilter.gain.value = 0;
    }

    private connectNodes() {
        // Chain: Input -> Low -> Mid -> High -> Output
        this.input.connect(this.lowFilter);
        this.lowFilter.connect(this.midFilter);
        this.midFilter.connect(this.highFilter);
        this.highFilter.connect(this.output);
    }

    // Value 0.0 to 1.0 (standard knob)
    // 0.0 -> -40dB (Kill)
    // 0.5 -> 0dB
    // 1.0 -> +6dB
    public setGain(band: 'low' | 'mid' | 'high', value: number) {
        const db = this.mapValueToDb(value);

        switch (band) {
            case 'low':
                this.lowFilter.gain.linearRampToValueAtTime(db, this.input.context.currentTime + 0.05);
                break;
            case 'mid':
                this.midFilter.gain.linearRampToValueAtTime(db, this.input.context.currentTime + 0.05);
                break;
            case 'high':
                this.highFilter.gain.linearRampToValueAtTime(db, this.input.context.currentTime + 0.05);
                break;
        }
    }

    private mapValueToDb(value: number): number {
        if (value <= 0.01) return -40; // Floor at -40dB (effectively silent for mixing)
        if (value === 0.5) return 0;
        if (value >= 1) return 6;

        if (value < 0.5) {
            // 0.0 to 0.5 -> -40 to 0
            // Linear map: -40 + (value * 2 * 40)
            return -40 + (value * 2 * 40);
        } else {
            // 0.5 to 1.0 -> 0 to 6
            // Linear map: (value - 0.5) * 2 * 6
            return (value - 0.5) * 2 * 6;
        }
    }
}
