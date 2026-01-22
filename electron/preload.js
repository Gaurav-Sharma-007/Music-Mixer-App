const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getDesktopSources: (types) => ipcRenderer.invoke('GET_SOURCES', types),
    loadYoutube: async (url) => {
        console.log("[Preload] loadYoutube called with:", url);
        try {
            const result = await ipcRenderer.invoke('LOAD_YOUTUBE_AUDIO', url);
            console.log("[Preload] loadYoutube result received");
            return result;
        } catch (error) {
            console.error("[Preload] loadYoutube error:", error);
            throw error;
        }
    },
    searchYoutube: (query, apiKey) => ipcRenderer.invoke('YOUTUBE_SEARCH', query, apiKey)
});

// Preload scripts
window.addEventListener('DOMContentLoaded', () => {
    console.log('Electron Preload Active');
});
