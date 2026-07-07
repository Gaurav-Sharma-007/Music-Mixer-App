export { };

declare global {
    type ElectronStemName = 'vocals' | 'drums' | 'bass' | 'other';

    interface StemAnalysisResult {
        message: string;
        cached: boolean;
        model: string;
        stems: Record<ElectronStemName, string>;
    }

    interface StemRequirementsInstallResult {
        success: boolean;
        stdout: string;
        stderr: string;
    }

    interface Window {
        electronAPI: {
            getDesktopSources: (types: string[]) => Promise<{ id: string; name: string; thumbnail: string }[]>;
            loadYoutube: (url: string) => Promise<ArrayBuffer | Uint8Array | { buffer: Uint8Array; title: string; sourceFilePath?: string }>;
            searchYoutube: (query: string, apiKey: string) => Promise<{ id: string; title: string; channel: string; thumbnail: string }[]>;
            analyzeStems?: (filePath: string) => Promise<StemAnalysisResult>;
            readAudioFile?: (filePath: string) => Promise<Uint8Array>;
            installStemRequirements?: () => Promise<StemRequirementsInstallResult>;
            getFilePath?: (file: File) => string;
        };
    }
}
