import React, { useState, useEffect, useRef } from 'react';
import { Recorder } from '../audio/Recorder';
import { Microphone } from '../audio/Microphone';
import { AudioContextManager } from '../audio/AudioContextManager';

const MasterControls: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
    const [micOn, setMicOn] = useState(false);
    const [micVolume, setMicVolume] = useState(0.5);

    const recorderRef = useRef<Recorder | null>(null);
    const micRef = useRef<Microphone | null>(null);
    const timerRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        recorderRef.current = new Recorder();
        micRef.current = new Microphone();
        return () => {
            micRef.current?.stop();
        };
    }, []);

    // Timer Logic
    useEffect(() => {
        if (isRecording) {
            timerRef.current = window.setInterval(() => {
                setElapsed(prev => prev + 1);
            }, 1000);
        } else {
            console.log("Stopping timer");
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRecording]);

    // Visualizer Logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const analyser = AudioContextManager.getInstance().getMasterAnalyser();
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let animationId: number;

        const draw = () => {
            animationId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height); // Transparent clear

            // Config
            const barCount = 40;
            // We want to capture low-mids mostly, so we skip high end
            // step = bufferLength / sampleRate stuff... just pick a range
            // bufferLength is 1024.
            const step = Math.floor(bufferLength / barCount / 2); // Zoom in on lows a bit

            const barWidth = (canvas.width / barCount) - 2;

            for (let i = 0; i < barCount; i++) {
                // Average a chunk
                let sum = 0;
                for (let j = 0; j < step; j++) {
                    sum += dataArray[i * step + j];
                }
                const avg = sum / step;

                const percent = avg / 255;
                const barHeight = percent * canvas.height;

                // Gradient color based on height/intensity
                // Green -> Yellow -> Red
                // Hue 120 (Green) to 0 (Red)
                const hue = 120 - (percent * 120);

                ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;

                // Draw rounded bar
                // x, y, w, h. y is from bottom
                ctx.fillRect(i * (barWidth + 2), canvas.height - barHeight, barWidth, barHeight);
            }
        };

        draw();

        return () => cancelAnimationFrame(animationId);
    }, []);


    const handleRecordToggle = async () => {
        if (!recorderRef.current) return;

        if (isRecording) {
            setIsRecording(false);
            const blob = await recorderRef.current.stop();
            setRecordingBlob(blob);
        } else {
            setRecordingBlob(null);
            setElapsed(0);
            recorderRef.current.start();
            setIsRecording(true);
        }
    };

    const handleDownload = () => {
        if (recordingBlob && recorderRef.current) {
            const date = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
            recorderRef.current.download(recordingBlob, `mix_${date}.webm`);
            setRecordingBlob(null); // Clear after download?
        }
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const toggleMic = async () => {
        if (!micRef.current) return;
        if (micOn) {
            micRef.current.stop();
            setMicOn(false);
        } else {
            try {
                await micRef.current.start();
                setMicOn(true);
            } catch (e) {
                alert("Could not access microphone.");
                console.error(e);
            }
        }
    };

    const handleMicVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setMicVolume(val);
        micRef.current?.setVolume(val);
    };

    return (
        <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-4 w-full backdrop-blur-md">
            {/* Visualizer Canvas */}
            <div className="w-full h-16 bg-black/40 rounded border border-white/5 overflow-hidden relative">
                <canvas ref={canvasRef} width={300} height={64} className="w-full h-full" />
                <div className="absolute top-1 right-1 text-[8px] text-gray-600 font-mono">MASTER OUT</div>
            </div>

            {/* Mic Controls */}
            <div className="flex items-center gap-3 w-full bg-black/20 p-2 rounded-lg border border-white/5">
                <button
                    onClick={toggleMic}
                    className={`text-[10px] items-center gap-1 font-bold px-3 py-1 rounded-full border transition-all flex uppercase
                        ${micOn ? 'bg-neon-blue/20 text-neon-blue border-neon-blue' : 'bg-transparent text-gray-500 border-white/10 hover:text-white'}`}
                >
                    {micOn ? 'Mic ON' : 'Mic OFF'}
                </button>
                <input
                    type="range"
                    min="0" max="1" step="0.01"
                    value={micVolume}
                    onChange={handleMicVolume}
                    className="flex-1 h-1 bg-gray-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gray-400 [&::-webkit-slider-thumb]:rounded-full"
                />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full justify-center">

                {/* Record Button */}
                <button
                    onClick={handleRecordToggle}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full font-bold uppercase tracking-widest transition-all text-xs flex-1 min-w-[120px]
                        ${isRecording
                            ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_red]'
                            : 'bg-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-400 border border-white/5'
                        }`}
                >
                    <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`}></div>
                    {isRecording ? 'Stop' : 'Rec'}
                </button>

                {/* Timer */}
                <div className="font-mono text-lg text-neon-blue tabular-nums min-w-[60px] text-center">
                    {formatTime(elapsed)}
                </div>

                {/* Download Button (appears when blob ready) */}
                {recordingBlob && !isRecording && (
                    <button
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-neon-blue/20 text-neon-blue border border-neon-blue/50 rounded-full hover:bg-neon-blue hover:text-black transition-all font-bold uppercase text-xs flex-1 min-w-[120px]"
                    >
                        <span>Save</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default MasterControls;
