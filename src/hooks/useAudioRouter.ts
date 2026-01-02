import { useState, useRef, useEffect, useCallback } from 'react';

export interface AudioDevice {
    deviceId: string;
    label: string;
}

export function useAudioRouter() {
    const [devices, setDevices] = useState<AudioDevice[]>([]);
    const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
    const [stream, setStream] = useState<MediaStream | null>(null);
    const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    // Allow external stream injection
    const setSourceStream = useCallback((newStream: MediaStream | null) => {
        // Stop old stream tracks if we were the ones who created it? 
        // Actually, for internal routing, we usually don't want to stop the AudioContext destination stream.
        // So just swapping reference is fine.
        setStream(newStream);
    }, []);

    // Detect available audio output devices
    const refreshDevices = useCallback(async () => {
        try {
            // Permission might be needed to see labels
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop tracks immediately to release mic
            stream.getTracks().forEach(t => t.stop());

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
        const initDevices = async () => {
            await refreshDevices();
        };
        initDevices();
        navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
    }, [refreshDevices]);

    // Start capturing system audio - DEPRECATED/REMOVED in favor of internal routing
    // const startCapture = async () => { ... }

    const stopRouting = useCallback(() => {
        setStream(null);

        // Cleanup all audio elements
        audioElementsRef.current.forEach((audio) => {
            audio.pause();
            audio.srcObject = null;
        });
        audioElementsRef.current.clear();
    }, []);

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
                if (audio.setSinkId) {
                    try {
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
        isCapturing: !!stream,
        devices,
        selectedDeviceIds,
        setSourceStream,
        stopRouting,
        toggleDevice,
        refreshDevices
    };
}
