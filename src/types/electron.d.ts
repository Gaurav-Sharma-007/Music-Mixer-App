export { };

declare global {
    interface Window {
        electronAPI: {
            getDesktopSources: (types: string[]) => Promise<{ id: string; name: string; thumbnail: string }[]>;
            loadYoutube: (url: string) => Promise<ArrayBuffer>;
            searchYoutube: (query: string, apiKey: string) => Promise<{ id: string; title: string; channel: string; thumbnail: string }[]>;
        };
    }
}
