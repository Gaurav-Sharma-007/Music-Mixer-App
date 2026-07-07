
import { useState, useCallback } from 'react';

interface YoutubeLoadObject {
    buffer: Uint8Array;
    title: string;
    sourceFilePath?: string;
}

type YoutubeLoadResponse = ArrayBuffer | Uint8Array | YoutubeLoadObject;

const isYoutubeLoadObject = (response: YoutubeLoadResponse): response is YoutubeLoadObject => {
    return response !== null && typeof response === 'object' && 'buffer' in response && 'title' in response;
};

const toAudioArrayBuffer = (data: ArrayBuffer | Uint8Array): ArrayBuffer => {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
};

export interface QueueItem {
    id: string;
    type: 'file' | 'youtube';
    file?: File;
    youtubeUrl?: string;
    name: string;
    duration: number;
    targetDeck: 'A' | 'B';
    preloadedBuffer?: ArrayBuffer; // Pre-loaded audio buffer for instant playback
    sourceFilePath?: string;
}

export function useMusicQueue() {
    const [queue, setQueue] = useState<QueueItem[]>([]);

    const addToQueue = useCallback(async (file: File, deckId: 'A' | 'B') => {
        const newItem: QueueItem = {
            id: crypto.randomUUID(),
            type: 'file',
            file,
            name: file.name,
            duration: 0,
            targetDeck: deckId
        };

        setQueue(prev => [...prev, newItem]);
    }, []);

    const addYoutubeToQueue = useCallback(async (url: string, name: string, deckId: 'A' | 'B') => {
        const itemId = crypto.randomUUID();
        const newItem: QueueItem = {
            id: itemId,
            type: 'youtube',
            youtubeUrl: url,
            name: name || 'YouTube Track',
            duration: 0,
            targetDeck: deckId
        };

        // Add to queue immediately
        setQueue(prev => [...prev, newItem]);

        // Pre-load in background
        if (window.electronAPI) {
            try {
                console.log(`[Queue] Pre-loading YouTube track: ${name}`);
                const response = await window.electronAPI.loadYoutube(url);
                const youtubeResponse = response as YoutubeLoadResponse;
                const rawBuffer = isYoutubeLoadObject(youtubeResponse)
                    ? youtubeResponse.buffer
                    : youtubeResponse;
                const arrayBuffer = toAudioArrayBuffer(rawBuffer);
                const sourceFilePath = isYoutubeLoadObject(youtubeResponse)
                    ? youtubeResponse.sourceFilePath
                    : undefined;

                // Update the queue item with pre-loaded buffer and source path for stem analysis.
                setQueue(prev => prev.map(item =>
                    item.id === itemId
                        ? { ...item, preloadedBuffer: arrayBuffer, sourceFilePath }
                        : item
                ));

                console.log(`[Queue] Pre-loaded successfully: ${name} (${arrayBuffer.byteLength} bytes)`);
            } catch (error) {
                console.error(`[Queue] Pre-load failed for: ${name}`, error);
                // Item stays in queue without buffer, will load on-demand
            }
        }
    }, []);

    const removeFromQueue = useCallback((id: string) => {
        setQueue(prev => prev.filter(item => item.id !== id));
    }, []);

    const clearQueue = useCallback(() => {
        setQueue([]);
    }, []);

    // Reorder simple implementation: swap
    const moveItem = useCallback((fromIndex: number, toIndex: number) => {
        setQueue(prev => {
            const newQueue = [...prev];
            const [moved] = newQueue.splice(fromIndex, 1);
            newQueue.splice(toIndex, 0, moved);
            return newQueue;
        });
    }, []);

    return {
        queue,
        addToQueue,
        addYoutubeToQueue,
        removeFromQueue,
        clearQueue,
        moveItem
    };
}
