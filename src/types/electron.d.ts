export { };

declare global {
    interface Window {
        electronAPI: {
            getDesktopSources: (types: string[]) => Promise<{ id: string; name: string; thumbnail: string }[]>;
        };
    }
}
