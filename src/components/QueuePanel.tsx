
import React, { useRef, useState } from 'react';
import type { QueueItem } from '../hooks/useMusicQueue';

interface QueuePanelProps {
    queue: QueueItem[];
    addToQueue: (file: File, deckId: 'A' | 'B') => void;
    addYoutubeToQueue: (url: string, name: string, deckId: 'A' | 'B') => void;
    removeFromQueue: (id: string) => void;
    clearQueue: () => void;
    moveItem: (fromIndex: number, toIndex: number) => void;
    onLoadToDeck: (file: File, deckId: 'A' | 'B') => void;
    onLoadYoutubeToDeck: (url: string, deckId: 'A' | 'B', preloadedBuffer?: ArrayBuffer, title?: string) => void;
    onClose: () => void;
}

const QueuePanel: React.FC<QueuePanelProps> = ({ queue, addToQueue, addYoutubeToQueue, removeFromQueue, clearQueue, moveItem, onLoadToDeck, onLoadYoutubeToDeck, onClose }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showYoutubeInput, setShowYoutubeInput] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [selectedDeck, setSelectedDeck] = useState<'A' | 'B'>('A');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [apiKey] = useState(localStorage.getItem('yt_api_key') || '');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, deckId: 'A' | 'B') => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => addToQueue(file, deckId));
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowAddMenu(false);
    };

    const handleYoutubeSearch = async () => {
        if (!youtubeUrl) return;

        // If it looks like a URL, just add it
        if (youtubeUrl.includes('http') || youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be')) {
            handleYoutubeSubmit(youtubeUrl);
            return;
        }

        if (!apiKey) {
            alert("No API Key found. Please set it in the deck YouTube search first.");
            return;
        }

        setIsSearching(true);
        try {
            if (window.electronAPI && window.electronAPI.searchYoutube) {
                const results = await window.electronAPI.searchYoutube(youtubeUrl, apiKey);
                setSearchResults(results);
            }
        } catch (e) {
            console.error(e);
            alert("Search failed. Check API Key or Quota.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleYoutubeSubmit = (urlToAdd?: string) => {
        const targetUrl = typeof urlToAdd === 'string' ? urlToAdd : youtubeUrl;
        if (!targetUrl || !targetUrl.trim()) return;

        // Extract video title from search results if available
        let videoTitle = 'YouTube Track';
        if (searchResults.length > 0) {
            const result = searchResults.find(r => `https://www.youtube.com/watch?v=${r.id}` === targetUrl);
            if (result) videoTitle = result.title;
        }

        addYoutubeToQueue(targetUrl.trim(), videoTitle, selectedDeck);
        setShowYoutubeInput(false);
        setYoutubeUrl('');
        setSearchResults([]);
    };

    const handleClearQueue = () => {
        if (queue.length === 0) return;
        if (confirm(`Clear all ${queue.length} items from queue?`)) {
            clearQueue();
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', '');
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== dropIndex) {
            moveItem(draggedIndex, dropIndex);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <div className="w-full lg:w-80 bg-zinc-900/90 border-l border-white/5 flex flex-col h-full backdrop-blur-md">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900 sticky top-0 z-10">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Queue</h3>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded transition flex items-center gap-1"
                        >
                            + Add Music
                            <span className="text-[10px]">▼</span>
                        </button>
                        {showAddMenu && (
                            <div className="absolute top-full mt-1 left-0 bg-zinc-800 border border-white/10 rounded shadow-lg overflow-hidden z-50 min-w-[140px]">
                                <button
                                    onClick={() => {
                                        setShowAddMenu(false);
                                        setSelectedDeck('A');
                                        fileInputRef.current?.click();
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 transition"
                                >
                                    📁 File to Deck A
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddMenu(false);
                                        setSelectedDeck('B');
                                        fileInputRef.current?.click();
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 transition border-t border-white/5"
                                >
                                    📁 File to Deck B
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddMenu(false);
                                        setSelectedDeck('A');
                                        setShowYoutubeInput(true);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 transition border-t border-white/5"
                                >
                                    🎥 YouTube to Deck A
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddMenu(false);
                                        setSelectedDeck('B');
                                        setShowYoutubeInput(true);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/10 transition border-t border-white/5"
                                >
                                    🎥 YouTube to Deck B
                                </button>
                            </div>
                        )}
                    </div>
                    {queue.length > 0 && (
                        <button
                            onClick={handleClearQueue}
                            className="text-xs bg-red-600/20 hover:bg-red-600/40 text-red-300 px-2 py-1 rounded transition border border-red-500/30"
                            title="Clear all queue items"
                        >
                            Clear
                        </button>
                    )}
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
                    onChange={(e) => handleFileChange(e, selectedDeck)}
                    className="hidden"
                    multiple
                    accept="audio/*"
                />
            </div>

            {/* YouTube Input Modal */}
            {showYoutubeInput && (
                <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-6 backdrop-blur-md">
                    <div className="w-full max-w-md flex flex-col gap-4 max-h-full">
                        <h3 className="text-sm font-bold text-indigo-400 tracking-widest uppercase mb-2 flex justify-between items-center">
                            <span>YouTube to Deck {selectedDeck}</span>
                        </h3>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={youtubeUrl}
                                onChange={e => setYoutubeUrl(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleYoutubeSearch();
                                }}
                                placeholder="Search or Paste URL..."
                                className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                                autoFocus
                            />
                            <button
                                onClick={handleYoutubeSearch}
                                disabled={isSearching}
                                className={`px-4 py-1.5 rounded text-xs font-bold bg-white text-black hover:bg-gray-200 ${isSearching ? 'opacity-50' : ''}`}
                            >
                                GO
                            </button>
                        </div>

                        {/* Results List */}
                        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 border-t border-white/5 pt-2 max-h-[200px] scrollbar-thin scrollbar-thumb-gray-700">
                            {searchResults.map((result) => (
                                <div
                                    key={result.id}
                                    onClick={() => handleYoutubeSubmit(`https://www.youtube.com/watch?v=${result.id}`)}
                                    className="flex gap-3 p-2 hover:bg-white/10 rounded cursor-pointer group transition-colors"
                                >
                                    <img src={result.thumbnail} alt="" className="w-12 h-9 object-cover rounded opacity-80 group-hover:opacity-100" />
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="text-xs text-white font-bold truncate">{result.title}</div>
                                        <div className="text-[10px] text-gray-400 truncate">{result.channel}</div>
                                    </div>
                                </div>
                            ))}
                            {searchResults.length === 0 && youtubeUrl && !youtubeUrl.includes('http') && (
                                <div className="text-center text-[10px] text-gray-500 py-4">Press GO to search</div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2 border-t border-white/5 gap-2">
                            <button onClick={() => setShowYoutubeInput(false)} className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white">Cancel</button>
                            {youtubeUrl.includes('http') && (
                                <button onClick={() => handleYoutubeSubmit()} className="px-3 py-1.5 rounded text-xs bg-indigo-600 hover:bg-indigo-500 text-white">Add to Queue</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {queue.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs py-10">
                        Queue is empty.<br />Add tracks to easily mix.
                    </div>
                ) : (
                    queue.map((item, index) => (
                        <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`bg-black/40 border rounded p-2 flex flex-col gap-2 group hover:bg-white/5 transition cursor-move
                                ${draggedIndex === index ? 'opacity-50' : ''}
                                ${dragOverIndex === index ? 'border-indigo-500' : 'border-white/5'}
                            `}
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 mb-1">
                                        <span className="text-[10px] cursor-move">☰</span>
                                        <span className="text-[10px]">{item.type === 'youtube' ? '🎥' : '📁'}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${item.targetDeck === 'A' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-neon-purple/20 text-neon-purple'}`}>
                                            → Deck {item.targetDeck}
                                        </span>
                                        {item.type === 'youtube' && !item.preloadedBuffer && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 animate-pulse">
                                                Loading...
                                            </span>
                                        )}
                                        {item.type === 'youtube' && item.preloadedBuffer && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                                                ✓ Ready
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs font-medium text-gray-200 truncate" title={item.name}>
                                        {item.name}
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFromQueue(item.id)}
                                    className="text-gray-600 hover:text-red-400 text-[10px] px-1 flex-shrink-0"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (item.type === 'file' && item.file) {
                                            onLoadToDeck(item.file, 'A');
                                            removeFromQueue(item.id);
                                        } else if (item.type === 'youtube' && item.youtubeUrl) {
                                            onLoadYoutubeToDeck(item.youtubeUrl, 'A', item.preloadedBuffer, item.name);
                                            removeFromQueue(item.id);
                                        }
                                    }}
                                    className="flex-1 bg-neon-blue/10 border border-neon-blue/30 text-neon-blue text-[10px] py-1 rounded hover:bg-neon-blue/20 transition"
                                >
                                    Load A
                                </button>
                                <button
                                    onClick={() => {
                                        if (item.type === 'file' && item.file) {
                                            onLoadToDeck(item.file, 'B');
                                            removeFromQueue(item.id);
                                        } else if (item.type === 'youtube' && item.youtubeUrl) {
                                            onLoadYoutubeToDeck(item.youtubeUrl, 'B', item.preloadedBuffer, item.name);
                                            removeFromQueue(item.id);
                                        }
                                    }}
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
