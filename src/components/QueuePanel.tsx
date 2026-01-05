
import React, { useRef } from 'react';
import type { QueueItem } from '../hooks/useMusicQueue';

interface QueuePanelProps {
    queue: QueueItem[];
    addToQueue: (file: File) => void;
    removeFromQueue: (id: string) => void;
    onLoadToDeck: (file: File, deckId: 'A' | 'B') => void;
    onClose: () => void;
}

const QueuePanel: React.FC<QueuePanelProps> = ({ queue, addToQueue, removeFromQueue, onLoadToDeck, onClose }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => addToQueue(file));
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="w-full lg:w-80 bg-zinc-900/90 border-l border-white/5 flex flex-col h-full backdrop-blur-md">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900 sticky top-0 z-10">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Queue</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition"
                    >
                        + Add Music
                    </button>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                    >
                        ✕
                    </button>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                    accept="audio/*"
                />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {queue.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs py-10">
                        Queue is empty.<br />Add tracks to easily mix.
                    </div>
                ) : (
                    queue.map((item) => (
                        <div key={item.id} className="bg-black/40 border border-white/5 rounded p-2 flex flex-col gap-2 group hover:bg-white/5 transition">
                            <div className="flex justify-between items-start">
                                <div className="text-xs font-medium text-gray-200 truncate w-full" title={item.name}>
                                    {item.name}
                                </div>
                                <button
                                    onClick={() => removeFromQueue(item.id)}
                                    className="text-gray-600 hover:text-red-400 text-[10px] px-1"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onLoadToDeck(item.file, 'A')}
                                    className="flex-1 bg-neon-blue/10 border border-neon-blue/30 text-neon-blue text-[10px] py-1 rounded hover:bg-neon-blue/20 transition"
                                >
                                    Load A
                                </button>
                                <button
                                    onClick={() => onLoadToDeck(item.file, 'B')}
                                    className="flex-1 bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-[10px] py-1 rounded hover:bg-neon-purple/20 transition"
                                >
                                    Load B
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default QueuePanel;
