const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getDesktopSources: (types) => ipcRenderer.invoke('GET_SOURCES', types)
});

// Preload scripts
window.addEventListener('DOMContentLoaded', () => {
    console.log('Electron Preload Active');
});
