import React, { useState, useRef } from 'react';
import { saveCustomTheme, type Theme } from '../themes/themeConfig';

interface ThemeCreatorProps {
    initialTheme?: Theme;
    onClose: () => void;
    onSave: (theme: Theme) => void;
}

const ThemeCreator: React.FC<ThemeCreatorProps> = ({ initialTheme, onClose, onSave }) => {
    const [name, setName] = useState(initialTheme ? initialTheme.label : '');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    // Use existing video URL if editing, or empty string
    const [videoPreview, setVideoPreview] = useState<string>(initialTheme?.customVideo || '');

    // Colors - initialize from theme or defaults
    const [premiumBlack, setPremiumBlack] = useState(initialTheme?.colors.premiumBlack || '#0a0a0a');
    const [premiumGray, setPremiumGray] = useState(initialTheme?.colors.premiumGray || '#1a1a1a');
    const [neonBlue, setNeonBlue] = useState(initialTheme?.colors.neonBlue || '#4d9fff');
    const [neonPurple, setNeonPurple] = useState(initialTheme?.colors.neonPurple || '#b537f2');
    // Check if sliderThumb is defined in the initial theme, if not default to white
    const [sliderThumb, setSliderThumb] = useState(initialTheme?.colors.sliderThumb || '#ffffff');
    const [useCustomSlider, setUseCustomSlider] = useState(!!initialTheme?.colors.sliderThumb);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setVideoFile(file);
            // Create a preview URL
            const url = URL.createObjectURL(file);
            setVideoPreview(url);
        }
    };

    const handleSave = () => {
        if (!name) return;

        // In a real browser app, we can't play local files persistently without re-selection.
        // However, we can store DataURLs (limited size) or Blob URLs (session only).
        // Since we want persistence across reloads, we'll try to convert to DataURL for small videos,
        // OR rely on re-selection. But typically users want set-and-forget.
        // For larger videos, IndexedDB is best. For simplicity here with assumed Electron context,
        // we might return the file path if available (Electron) or Base64.

        // For this implementation, we'll assume the user understands session limitations if web-only,
        // or we try to use the path if Electron exposes it (via input.files[0].path).

        let videoSrc = '';
        if (videoFile) {
            // Electron specific: try to get path via exposed API
            let path = '';
            if (window.electronAPI && window.electronAPI.getFilePath) {
                try {
                    path = window.electronAPI.getFilePath(videoFile);
                } catch (e) {
                    console.error("Failed to get file path via electronAPI", e);
                }
            }

            // Fallback to legacy check (if nodeIntegration were on, which it isn't) 
            // or if API failed
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!path && (videoFile as any).path) path = (videoFile as any).path;

            if (path) {
                videoSrc = `file://${path}`;
            } else {
                // Fallback for web: Blob URL (will trigger re-upload need on reload)
                videoSrc = videoPreview;
            }
        } else if (initialTheme && initialTheme.customVideo) {
            // Keep existing video if no new one selected
            videoSrc = initialTheme.customVideo;
        }

        const newTheme: Theme = {
            name: (typeof initialTheme !== 'undefined' && initialTheme) ? initialTheme.name : `custom-${Date.now()}`, // Preserve ID if editing
            label: name,
            isCustom: true,
            customVideo: videoSrc,
            colors: {
                premiumBlack,
                premiumGray,
                neonBlue,
                neonPurple,
                sliderThumb: useCustomSlider ? sliderThumb : undefined
            },
            animation: {
                pulseSlow: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }
        };

        saveCustomTheme(newTheme);
        onSave(newTheme);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    ✕
                </button>

                <h2 className="text-xl font-bold text-white mb-6 tracking-wider">{typeof initialTheme !== 'undefined' && initialTheme ? 'EDIT THEME (Beta)' : 'CREATE THEME (Beta)'}</h2>

                <div className="space-y-6">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Theme Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-white/50"
                            placeholder="My Awesome Theme"
                        />
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Background</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={premiumBlack}
                                    onChange={e => setPremiumBlack(e.target.value)}
                                    className="w-full h-8 cursor-pointer rounded bg-transparent p-0 border-0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Panels</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={premiumGray}
                                    onChange={e => setPremiumGray(e.target.value)}
                                    className="w-full h-8 cursor-pointer rounded bg-transparent p-0 border-0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neon-blue mb-1 uppercase tracking-wider">Deck A Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={neonBlue}
                                    onChange={e => setNeonBlue(e.target.value)}
                                    className="w-full h-8 cursor-pointer rounded bg-transparent p-0 border-0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neon-purple mb-1 uppercase tracking-wider">Deck B Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={neonPurple}
                                    onChange={e => setNeonPurple(e.target.value)}
                                    className="w-full h-8 cursor-pointer rounded bg-transparent p-0 border-0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Slider Override */}
                    <div className="border-t border-white/5 pt-4">
                        <label className="flex items-center gap-2 mb-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useCustomSlider}
                                onChange={e => setUseCustomSlider(e.target.checked)}
                            />
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custom Slider Thumb</span>
                        </label>
                        {useCustomSlider && (
                            <input
                                type="color"
                                value={sliderThumb}
                                onChange={e => setSliderThumb(e.target.value)}
                                className="w-full h-8 cursor-pointer rounded bg-transparent p-0 border-0"
                            />
                        )}
                    </div>

                    {/* Video Upload */}
                    <div className="border-t border-white/5 pt-4">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Background Video (MP4)</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/mp4,video/webm"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm text-gray-300 transition-colors mb-2"
                        >
                            {videoFile ? 'Change Video' : 'Select Video File'}
                        </button>
                        {videoFile && (
                            <div className="text-xs text-green-400 truncate mb-2">Selected: {videoFile.name}</div>
                        )}
                        {videoPreview && (
                            <div className="aspect-video w-full bg-black rounded overflow-hidden border border-white/10">
                                <video src={videoPreview} autoPlay loop muted className="w-full h-full object-cover opacity-50" />
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={!name}
                        className={`w-full py-3 mt-4 rounded font-bold tracking-widest uppercase transition-all
                            ${name
                                ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02]'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {typeof initialTheme !== 'undefined' && initialTheme ? 'Update Theme' : 'Save Theme'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThemeCreator;
