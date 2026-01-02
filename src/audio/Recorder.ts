import { AudioContextManager } from './AudioContextManager';

export class Recorder {
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private streamDest: MediaStreamAudioDestinationNode;
    private context: AudioContext;

    constructor() {
        this.context = AudioContextManager.getInstance().getContext();
        const masterGain = AudioContextManager.getInstance().getMasterGain();

        // Create a destination for recording
        this.streamDest = this.context.createMediaStreamDestination();
        masterGain.connect(this.streamDest);
    }

    public start() {
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        const stream = this.streamDest.stream;
        let mimeType = 'audio/webm;codecs=opus';
        // Safari fallback or standard check
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4'; // Fallback
        }

        try {
            this.mediaRecorder = new MediaRecorder(stream, { mimeType });
        } catch (e) {
            console.error('MediaRecorder initialization failed', e);
            return;
        }

        this.recordedChunks = [];
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.start();
        console.log('Recording started');
    }

    public stop(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject('No recorder active');
                return;
            }

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, {
                    type: this.mediaRecorder?.mimeType || 'audio/webm'
                });
                this.recordedChunks = [];
                resolve(blob);
            };

            this.mediaRecorder.stop();
            console.log('Recording stopped');
        });
    }

    public download(blob: Blob, filename = 'mix-recording.webm') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}
