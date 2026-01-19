const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getDesktopSources: (types) => ipcRenderer.invoke('GET_SOURCES', types),
    loadYoutube: (url) => ipcRenderer.invoke('LOAD_YOUTUBE_AUDIO', url),
    searchYoutube: (query, apiKey) => ipcRenderer.invoke('YOUTUBE_SEARCH', query, apiKey)
});

// Preload scripts
window.addEventListener('DOMContentLoaded', () => {
    console.log('Electron Preload Active');
});
