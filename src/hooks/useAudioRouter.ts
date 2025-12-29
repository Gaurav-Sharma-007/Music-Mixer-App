import { useState, useRef, useEffect, useCallback } from 'react';

export interface AudioDevice {
    deviceId: string;
    label: string;
}

export function useAudioRouter() {
    const [isCapturing, setIsCapturing] = useState(false);
    const [devices, setDevices] = useState<AudioDevice[]>([]);
    const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
    const [stream, setStream] = useState<MediaStream | null>(null);
    const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    // Detect available audio output devices
    const refreshDevices = useCallback(async () => {
        try {
            // Permission might be needed to see labels
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const outputDevices = allDevices
                .filter((d) => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications')
                .map((d) => ({
                    deviceId: d.deviceId,
                    label: d.label || `Speaker (${d.deviceId.slice(0, 5)}...)`,
                }));
            setDevices(outputDevices);
        } catch (err) {
            console.error('Failed to enumerate devices:', err);
        }
    }, []);

    // Initial device scan
    useEffect(() => {
        refreshDevices();
        navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
    }, [refreshDevices]);

    // Start capturing system audio
    const startCapture = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: true, // Required to get the picker, even if we assume user selects audio
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    channelCount: 2,
                    // @ts-ignore
                    latency: 0,
                },
            });

            // We only care about the audio track
            const audioTrack = mediaStream.getAudioTracks()[0];
            if (!audioTrack) {
                throw new Error('No audio track selected. Please make sure to verify "Share Audio" in the browser prompt.');
            }

            // Stop the video track immediately to save resources/UI clutter
            mediaStream.getVideoTracks().forEach(track => track.stop());

            // If user stops sharing from browser UI
            audioTrack.onended = () => stopCapture();

            // Create a new stream with just the audio
            const audioStream = new MediaStream([audioTrack]);
            setStream(audioStream);
            setIsCapturing(true);
        } catch (err) {
            console.error('Error start capturing:', err);
        }
    };

    const stopCapture = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach((t) => t.stop());
        }
        setStream(null);
        setIsCapturing(false);

        // Cleanup all audio elements
        audioElementsRef.current.forEach((audio) => {
            audio.pause();
            audio.srcObject = null;
        });
        audioElementsRef.current.clear();
    }, [stream]);

    // Toggle selection of a device
    const toggleDevice = (deviceId: string) => {
        const next = new Set(selectedDeviceIds);
        if (next.has(deviceId)) {
            next.delete(deviceId);
        } else {
            next.add(deviceId);
        }
        setSelectedDeviceIds(next);
    };

    // Sync audio elements with selected devices and current stream
    useEffect(() => {
        if (!stream) return;

        // 1. Add new audio elements for newly selected devices
        selectedDeviceIds.forEach(async (deviceId) => {
            if (!audioElementsRef.current.has(deviceId)) {
                const audio = new Audio();
                audio.srcObject = stream;
                // @ts-ignore - setSinkId is not yet in standard TS dom lib for all browsers
                if (audio.setSinkId) {
                    try {
                        // @ts-ignore
                        await audio.setSinkId(deviceId);
                        await audio.play();
                        audioElementsRef.current.set(deviceId, audio);
                    } catch (err) {
                        console.error(`Failed to route to device ${deviceId}`, err);
                    }
                } else {
                    console.warn('setSinkId not supported');
                }
            }
        });

        // 2. Remove audio elements for deselected devices
        for (const [deviceId, audio] of audioElementsRef.current.entries()) {
            if (!selectedDeviceIds.has(deviceId)) {
                audio.pause();
                audio.srcObject = null;
                audioElementsRef.current.delete(deviceId);
            }
        }
    }, [selectedDeviceIds, stream]);

    return {
        isCapturing,
        devices,
        selectedDeviceIds,
        startCapture,
        stopCapture,
        toggleDevice,
        refreshDevices
    };
}
