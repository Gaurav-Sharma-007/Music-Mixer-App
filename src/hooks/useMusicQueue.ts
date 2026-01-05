
import { useState, useCallback } from 'react';

export interface QueueItem {
    id: string;
    file: File;
    name: string;
    duration: number;
}

export function useMusicQueue() {
    const [queue, setQueue] = useState<QueueItem[]>([]);

    const addToQueue = useCallback(async (file: File) => {
        // We might want to get duration, but that requires decoding. 
        // For queue, maybe just name is enough initially.
        // Or create an offline context to decode header? Expensive.
        // Let's just store file and name.

        const newItem: QueueItem = {
            id: crypto.randomUUID(),
            file,
            name: file.name,
            duration: 0 // Placeholder until loaded or analysis
        };

        setQueue(prev => [...prev, newItem]);
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
        removeFromQueue,
        clearQueue,
        moveItem
    };
}
