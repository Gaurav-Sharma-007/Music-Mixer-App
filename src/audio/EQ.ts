export interface EQ3Band {
    low: BiquadFilterNode;
    mid: BiquadFilterNode;
    high: BiquadFilterNode;
}

export class EQ {
    private bands: EQ3Band;
    public input: GainNode;
    public output: GainNode;

    constructor(context: AudioContext) {
        this.input = context.createGain();
        this.output = context.createGain();

        // Create filters
        this.bands = {
            low: context.createBiquadFilter(),
            mid: context.createBiquadFilter(),
            high: context.createBiquadFilter()
        };

        this.configureFilters();
        this.connectNodes();
    }

    private configureFilters() {
        // Low Shelf: < 250Hz
        this.bands.low.type = 'lowshelf';
        this.bands.low.frequency.value = 250;

        // Peaking: 2.5kHz
        this.bands.mid.type = 'peaking';
        this.bands.mid.frequency.value = 2500;
        this.bands.mid.Q.value = 1;

        // High Shelf: > 2.5kHz (typically 8k or 10k, but simple 3-band split often uses 2.5k boundary or similar)
        // Let's standard DJ EQ:
        // Low: ~200Hz, Mid: ~1kHz, High: ~4kHz? 
        // Let's stick to user spec "Low / Mid / High". Common centers:
        // Low < 300, High > 4000.

        this.bands.high.type = 'highshelf';
        this.bands.high.frequency.value = 2500; // Overlapping with mid?

        // Improved frequencies for better separation
        this.bands.low.frequency.value = 200;
        this.bands.mid.frequency.value = 1000;
        this.bands.high.frequency.value = 4000;
    }

    private connectNodes() {
        // Chain: Input -> Low -> Mid -> High -> Output
        this.input.connect(this.bands.low);
        this.bands.low.connect(this.bands.mid);
        this.bands.mid.connect(this.bands.high);
        this.bands.high.connect(this.output);
    }

    public setLow(value: number) {
        // Value range usually -40 to +6 dB. User slider might be 0-1 or something.
        // Let's assume input matches gain directly or we map 0-1 to dB range.
        // For now, let's assume direct dB value or a mapping method.
        // Standard DJ EQ kills (-inf) to +6dB.
        this.bands.low.gain.value = value;
    }

    public setMid(value: number) {
        this.bands.mid.gain.value = value;
    }

    public setHigh(value: number) {
        this.bands.high.gain.value = value;
    }
}
