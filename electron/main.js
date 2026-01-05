import { app, BrowserWindow, ipcMain, desktopCapturer } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            zoomFactor: 0.7 // Further reduce zoom level to prevent visual magnification
        },
        icon: path.join(__dirname, '../public/logo.png')
    });

    // Use environment variable or argument to detect dev mode
    // We'll trust that running through proper scripts sets things up
    // Ideally checking !app.isPackaged or process.env.NODE_ENV === 'development'

    if (!app.isPackaged) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        // In production, load the built index.html
        // Assuming dist/index.html is relative to the root where main.js might be bundled or adjacent
        // Adjust path based on build structure. 
        // Usually electron-builder packages 'dist' folder.
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    // IPC Handler for Screens/Windows
    ipcMain.handle('GET_SOURCES', async (event, types) => {
        const sources = await desktopCapturer.getSources({ types });
        return sources.map(source => ({
            id: source.id,
            name: source.name,
            thumbnail: source.thumbnail.toDataURL()
        }));
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
