import React from 'react';

interface FileLoaderProps {
    onFileSelect: (file: File) => void;
    label?: string;
    color?: 'blue' | 'purple';
}

const FileLoader: React.FC<FileLoaderProps> = ({ onFileSelect, label = 'Load Track', color = 'blue' }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    const isBlue = color === 'blue';

    const gradientClass = isBlue
        ? 'bg-gradient-to-r from-neon-blue to-blue-600 hover:from-neon-blue/80 hover:to-blue-500'
        : 'bg-gradient-to-r from-neon-purple to-purple-600 hover:from-neon-purple/80 hover:to-purple-500';

    const shadowClass = isBlue
        ? 'shadow-[0_0_15px_rgba(77,159,255,0.4)] hover:shadow-[0_0_25px_rgba(77,159,255,0.6)]'
        : 'shadow-[0_0_15px_rgba(181,55,242,0.4)] hover:shadow-[0_0_25px_rgba(181,55,242,0.6)]';

    return (
        <div className="flex flex-col items-center w-full">
            <label className={`
                w-full text-center cursor-pointer 
                ${gradientClass} 
                text-white font-bold uppercase tracking-widest text-xs
                px-6 py-3 rounded-xl 
                ${shadowClass}
                border border-white/20
                transform transition-all duration-300
                hover:scale-[1.02] active:scale-95
                flex items-center justify-center gap-2
            `}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                {label}
                <input
                    type="file"
                    accept="audio/mp3,audio/wav,audio/flac,audio/mpeg"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </label>
        </div>
    );
};

export default FileLoader;
