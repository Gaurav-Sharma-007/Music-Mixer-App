
import { useState, useCallback } from 'react';

export interface QueueItem {
    id: string;
    type: 'file' | 'youtube';
    file?: File;
    youtubeUrl?: string;
    name: string;
    duration: number;
    targetDeck: 'A' | 'B';
    preloadedBuffer?: ArrayBuffer; // Pre-loaded audio buffer for instant playback
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

                let rawBuffer: any;
                if (response && (response as any).buffer) {
                    rawBuffer = (response as any).buffer;
                } else {
                    rawBuffer = response;
                }

                const arrayBuffer = (rawBuffer as any).buffer ? (rawBuffer as any).buffer : rawBuffer;

                // Update the queue item with pre-loaded buffer
                setQueue(prev => prev.map(item =>
                    item.id === itemId
                        ? { ...item, preloadedBuffer: arrayBuffer }
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
