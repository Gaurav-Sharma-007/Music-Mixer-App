import React, { useEffect, useState } from 'react';

interface Source {
    id: string;
    name: string;
    thumbnail: string;
}

interface SourceSelectorProps {
    onSelect: (sourceId: string) => void;
    onCancel: () => void;
}

const SourceSelector: React.FC<SourceSelectorProps> = ({ onSelect, onCancel }) => {
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSources = async () => {
            if (window.electronAPI) {
                try {
                    const fetchedSources = await window.electronAPI.getDesktopSources(['window', 'screen']);
                    setSources(fetchedSources);
                } catch (e) {
                    console.error("Failed to get sources", e);
                } finally {
                    setLoading(false);
                }
            } else {
                console.warn("Electron API not available");
                setLoading(false);
            }
        };

        fetchSources();
    }, []);

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-bold tracking-widest text-white uppercase">Select Audio Source</h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4">
                    {loading && <div className="text-center col-span-full py-10 text-gray-500">Loading sources...</div>}

                    {!loading && sources.length === 0 && (
                        <div className="text-center col-span-full py-10 text-gray-500">
                            No sources found. Are you running in Electron?
                        </div>
                    )}

                    {sources.map(source => (
                        <button
                            key={source.id}
                            onClick={() => onSelect(source.id)}
                            className="flex flex-col gap-2 p-3 bg-black/40 border border-white/5 rounded-xl hover:bg-white/5 hover:border-neon-blue transition-all group text-left"
                        >
                            <div className="rounded-lg overflow-hidden border border-white/5 aspect-video bg-black relative">
                                <img src={source.thumbnail} alt={source.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-xs font-bold text-gray-300 group-hover:text-white truncate w-full" title={source.name}>
                                {source.name}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="p-4 border-t border-white/5 text-center text-xs text-gray-500">
                    Select an application or screen to route its audio into the deck.
                </div>
            </div>
        </div>
    );
};

export default SourceSelector;
