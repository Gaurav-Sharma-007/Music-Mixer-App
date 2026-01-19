import { app, BrowserWindow, ipcMain, desktopCapturer } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
            zoomFactor: 0.7
        },
        icon: path.join(__dirname, "../public/logo.png")
    });

    if (!app.isPackaged) {
        win.loadURL("http://localhost:5173");
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, "../dist/index.html"));
    }
}

app.whenReady().then(() => {

    /* ===============================
       SCREEN / WINDOW CAPTURE
       =============================== */
    ipcMain.handle("GET_SOURCES", async (_, types) => {
        const sources = await desktopCapturer.getSources({ types });
        return sources.map(source => ({
            id: source.id,
            name: source.name,
            thumbnail: source.thumbnail.toDataURL()
        }));
    });

    /* ===============================
       YOUTUBE SEARCH (DATA API)
       =============================== */
    ipcMain.handle("YOUTUBE_SEARCH", async (_, query, apiKey) => {
        try {
            if (!query || !apiKey) {
                throw new Error("Query or API key missing");
            }

            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(
                    query
                )}&key=${apiKey}`
            );

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            return data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.default.url
            }));
        } catch (err) {
            console.error("YOUTUBE_SEARCH failed:", err);
            throw err;
        }
    });

    /* ===============================
       YOUTUBE AUDIO LOADER (FIXED)
       =============================== */
    ipcMain.handle("LOAD_YOUTUBE_AUDIO", async (_, input) => {
        try {
            console.log("LOAD_YOUTUBE_AUDIO input:", input);

            if (!input || typeof input !== "string") {
                throw new Error("Invalid input received");
            }

            // Normalize input → full YouTube URL
            let url = input.trim();

            // If renderer passed only videoId
            if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
                url = `https://www.youtube.com/watch?v=${url}`;
            }

            // Remove playlist parameters
            url = url.split("&list=")[0].split("&index=")[0];

            if (!url.startsWith("http")) {
                throw new Error(`Invalid YouTube URL: ${url}`);
            }

            console.log("Normalized YouTube URL:", url);

            // Dynamically import @distube/ytdl-core // turbo-ignore
            const ytdl = (await import("@distube/ytdl-core")).default;

            if (!ytdl.validateURL(url)) {
                throw new Error("Invalid YouTube URL (validation failed)");
            }

            console.log("Fetching video info...");
            const info = await ytdl.getInfo(url);

            console.log("Downloading audio stream...");
            const format = ytdl.chooseFormat(info.formats, {
                quality: 'highestaudio',
                filter: 'audioonly'
            });

            if (!format) {
                throw new Error("No suitable audio format found");
            }

            const stream = ytdl(url, { format: format });

            // Collect stream into buffer
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            const buffer = Buffer.concat(chunks);

            if (buffer.length < 1000) {
                throw new Error("Audio buffer too small");
            }

            console.log("Audio loaded. Size:", buffer.length);

            return buffer;

        } catch (err) {
            console.error("LOAD_YOUTUBE_AUDIO failed:", err);
            throw err;
        }
    });

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
