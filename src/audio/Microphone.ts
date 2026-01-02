import { AudioContextManager } from "./AudioContextManager";

export class Microphone {
    private stream: MediaStream | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private gainNode: GainNode;
    private context: AudioContext;

    constructor() {
        this.context = AudioContextManager.getInstance().getContext();
        this.gainNode = this.context.createGain();
        this.gainNode.gain.value = 0.5; // Default 50%

        // Connect Mic Gain -> Master Gain
        this.gainNode.connect(AudioContextManager.getInstance().getMasterGain());
    }

    public async start() {
        if (this.stream) return;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.sourceNode = this.context.createMediaStreamSource(this.stream);
            if (this.sourceNode) {
                this.sourceNode.connect(this.gainNode);
            }
        } catch (err) {
            console.error("Failed to start microphone", err);
            throw err;
        }
    }

    public stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
    }

    public setVolume(value: number) {
        this.gainNode.gain.setTargetAtTime(value, this.context.currentTime, 0.05);
    }
}
