import React from 'react';

interface FileLoaderProps {
    onFileSelect: (file: File) => void;
    label?: string;
}

const FileLoader: React.FC<FileLoaderProps> = ({ onFileSelect, label = 'Load Track' }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded shadow transition">
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
