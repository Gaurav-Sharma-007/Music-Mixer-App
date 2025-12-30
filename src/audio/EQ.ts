
export class EQ {
    private bands: BiquadFilterNode[] = [];
    public input: GainNode;
    public output: GainNode;

    // Standard Graphic EQ Frequencies
    private readonly frequencies = [60, 150, 400, 1000, 2400, 6000, 12000, 15000];

    constructor(context: AudioContext) {
        this.input = context.createGain();
        this.output = context.createGain();

        // Create and configure filters
        this.frequencies.forEach((freq, index) => {
            const filter = context.createBiquadFilter();
            filter.frequency.value = freq;

            // Band 0: Low Shelf
            if (index === 0) {
                filter.type = 'lowshelf';
            }
            // Last Band: High Shelf
            else if (index === this.frequencies.length - 1) {
                filter.type = 'highshelf';
            }
            // Others: Peaking
            else {
                filter.type = 'peaking';
                filter.Q.value = 1.4; // Updated Q for better band separation (approx 1 octave)
            }

            this.bands.push(filter);
        });

        this.connectNodes();
    }

    private connectNodes() {
        // Chain: Input -> Band 0 -> Band 1 ... -> Last Band -> Output
        if (this.bands.length === 0) {
            this.input.connect(this.output);
            return;
        }

        this.input.connect(this.bands[0]);

        for (let i = 0; i < this.bands.length - 1; i++) {
            this.bands[i].connect(this.bands[i + 1]);
        }

        this.bands[this.bands.length - 1].connect(this.output);
    }

    public setGain(bandIndex: number, value: number) {
        if (bandIndex >= 0 && bandIndex < this.bands.length) {
            this.bands[bandIndex].gain.value = value;
        }
    }

    public getBandCount(): number {
        return this.bands.length;
    }

    public getFrequencies(): number[] {
        return [...this.frequencies];
    }
}
