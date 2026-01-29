import { app, BrowserWindow, ipcMain, desktopCapturer } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { execFile, spawn } from "child_process";
import { promisify } from "util";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFilePromise = promisify(execFile);

// Cache for video metadata to reduce API calls
const videoCache = new Map();
const CACHE_EXPIRY = 3600000; // 1 hour in milliseconds

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
            zoomFactor: 0.7,
            webSecurity: false
        },
        icon: path.join(__dirname, "../dist/logo.png")
    });

    if (!app.isPackaged) {
        win.loadURL("http://localhost:5173");
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, "../dist/index.html"));
    }

    return win;
}

app.whenReady().then(async () => {

    // Spawn Python Server
    const pythonScript = path.join(__dirname, "../backend/server.py");
    console.log("[Python] Spawning server at:", pythonScript);

    let pythonProcess = spawn("python", [pythonScript]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`[Python] ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python] ${data}`);
    });

    pythonProcess.on('error', (err) => {
        console.error('[Python] Failed to start process:', err);
    });

    pythonProcess.on('exit', (code, signal) => {
        console.log(`[Python] Server exited with code ${code} and signal ${signal}`);
    });

    // Ensure we kill python on exit
    app.on('will-quit', () => {
        if (pythonProcess) {
            console.log("[Python] Killing server...");
            pythonProcess.kill();
        }
    });

    ipcMain.handle("GET_SOURCES", async (_, types) => {
        const sources = await desktopCapturer.getSources({ types });
        return sources.map(source => ({
            id: source.id,
            name: source.name,
            thumbnail: source.thumbnail.toDataURL()
        }));
    });

    // Enhanced YouTube search with caching and error handling
    ipcMain.handle("YOUTUBE_SEARCH", async (_, query, apiKey) => {
        try {
            if (!apiKey) {
                throw new Error("YouTube API key is required");
            }

            if (!query || query.trim().length === 0) {
                return [];
            }

            const cacheKey = `search:${query}`;
            const cached = videoCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
                console.log("[YouTube] Returning cached search results for:", query);
                return cached.data;
            }

            const url = new URL("https://www.googleapis.com/youtube/v3/search");
            url.searchParams.append("part", "snippet");
            url.searchParams.append("type", "video");
            url.searchParams.append("maxResults", "25");
            url.searchParams.append("videoCategoryId", "10"); // Music category
            url.searchParams.append("q", query);
            url.searchParams.append("key", apiKey);

            console.log("[YouTube] Searching for:", query);
            const response = await fetch(url.toString());

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`YouTube API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const results = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
                publishedAt: item.snippet.publishedAt,
                description: item.snippet.description
            }));

            // Cache the results
            videoCache.set(cacheKey, {
                data: results,
                timestamp: Date.now()
            });

            return results;
        } catch (error) {
            console.error("[YouTube] Search error:", error.message);
            throw error;
        }
    });

    // Get detailed video information including duration
    ipcMain.handle("YOUTUBE_VIDEO_DETAILS", async (_, videoId, apiKey) => {
        try {
            if (!apiKey) {
                throw new Error("YouTube API key is required");
            }

            const cacheKey = `details:${videoId}`;
            const cached = videoCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
                console.log("[YouTube] Returning cached video details for:", videoId);
                return cached.data;
            }

            const url = new URL("https://www.googleapis.com/youtube/v3/videos");
            url.searchParams.append("part", "snippet,contentDetails,statistics");
            url.searchParams.append("id", videoId);
            url.searchParams.append("key", apiKey);

            console.log("[YouTube] Fetching details for video:", videoId);
            const response = await fetch(url.toString());

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`YouTube API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                throw new Error("Video not found");
            }

            const video = data.items[0];
            const details = {
                id: video.id,
                title: video.snippet.title,
                channel: video.snippet.channelTitle,
                description: video.snippet.description,
                thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url,
                duration: video.contentDetails.duration, // ISO 8601 format (PT4M13S)
                viewCount: video.statistics.viewCount,
                likeCount: video.statistics.likeCount,
                publishedAt: video.snippet.publishedAt
            };

            // Cache the details
            videoCache.set(cacheKey, {
                data: details,
                timestamp: Date.now()
            });

            return details;
        } catch (error) {
            console.error("[YouTube] Video details error:", error.message);
            throw error;
        }
    });

    // Enhanced audio loading with better error handling and progress updates
    ipcMain.handle("LOAD_YOUTUBE_AUDIO", async (event, input) => {
        try {
            console.log("[YouTube] ===== NEW REQUEST (STRICT: PYTHON) =====");
            console.log("[YouTube] Input received:", input);

            if (!input || typeof input !== 'string') {
                console.error("[YouTube] Invalid input:", input);
                throw new Error(`Invalid URL: expected string, got ${typeof input}`);
            }

            let url = input.trim();
            // Normalize URL
            if (!url.startsWith("http")) {
                url = `https://www.youtube.com/watch?v=${url.split("&")[0]}`;
            } else if (url.includes("&list=")) {
                url = url.split("&list=")[0];
            }

            console.log("[YouTube] Normalized URL:", url);

            // Extract video ID for progress updates
            const videoId = url.match(/(?:v=|\/)([\w-]{11})/)?.[1];

            // Notify renderer about download start
            event.sender.send("YOUTUBE_DOWNLOAD_PROGRESS", {
                videoId,
                status: "downloading",
                progress: 0
            });

            // PRIORITY 1: PYTHON SERVER (PRIMARY)
            try {
                console.log("[YouTube] Attempting download with Python Server...");
                event.sender.send("YOUTUBE_DOWNLOAD_PROGRESS", { videoId, status: "downloading", progress: 10 });

                const response = await fetch("http://127.0.0.1:5000/download", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Python server error");
                }

                console.log("[YouTube] Python download success:", result.title);
                console.log("[YouTube] File path:", result.file_path);

                event.sender.send("YOUTUBE_DOWNLOAD_PROGRESS", { videoId, status: "downloading", progress: 90 });

                // Read the file buffer
                const buffer = fs.readFileSync(result.file_path);

                // Auto-cleanup: Delete file after reading
                try {
                    fs.unlinkSync(result.file_path);
                    console.log("[YouTube] Cleaned up temporary file:", result.file_path);
                } catch (cleanupError) {
                    console.warn("[YouTube] Failed to cleanup temp file:", cleanupError.message);
                }

                event.sender.send("YOUTUBE_DOWNLOAD_PROGRESS", { videoId, status: "complete", progress: 100 });

                return {
                    buffer: new Uint8Array(buffer),
                    title: result.title || "YouTube Track"
                };

            } catch (pythonError) {
                console.warn("[YouTube] Python server failed:", pythonError.message);
                event.sender.send("YOUTUBE_DOWNLOAD_PROGRESS", { videoId, status: "fallback", progress: 0 });

                // PRIORITY 2: YT-DLP FALLBACK (ONLY IF PYTHON FAILS)
                console.log("[YouTube] Falling back to yt-dlp...");

                // Resolve yt-dlp path
                let ytDlpPath = 'yt-dlp'; // Default to PATH
                if (app.isPackaged) {
                    const bundledPath = path.join(process.resourcesPath, 'yt-dlp', 'yt-dlp.exe');
                    if (fs.existsSync(bundledPath)) {
                        ytDlpPath = bundledPath;
                    }
                } else {
                    const localPath = path.join(__dirname, '../yt-dlp/yt-dlp.exe');
                    if (fs.existsSync(localPath)) {
                        ytDlpPath = localPath;
                    }
                }

                let videoTitle = "YouTube Track";
                try {
                    const result = await execFilePromise(ytDlpPath, ['--get-title', url]);
                    videoTitle = (result.stdout || "").trim() || "YouTube Track";
                } catch (e) {
                    console.warn("[YouTube] Could not fetch title:", e.message);
                }

                const { stdout } = await execFilePromise(ytDlpPath, [
                    url,
                    '-f', 'bestaudio/best',
                    '--extract-audio',
                    '--audio-format', 'mp3',
                    '--audio-quality', '0',
                    '--no-playlist',
                    '--no-warnings',
                    '-o', '-'
                ], {
                    maxBuffer: 100 * 1024 * 1024,
                    encoding: null
                });

                const buffer = Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);

                if (buffer.length < 1000) {
                    throw new Error("yt-dlp buffer too small");
                }

                event.sender.send("YOUTUBE_DOWNLOAD_PROGRESS", { videoId, status: "complete", progress: 100 });
                return { buffer, title: videoTitle };
            }

        } catch (error) {
            console.error("[YouTube] Error:", error.message);
            event.sender.send("YOUTUBE_DOWNLOAD_PROGRESS", {
                videoId: null,
                status: "error",
                progress: 0,
                error: error.message
            });
            throw error;
        }
    });

    // Clear cache handler
    ipcMain.handle("CLEAR_YOUTUBE_CACHE", async () => {
        videoCache.clear();
        console.log("[YouTube] Cache cleared");
        return true;
    });

    // Get quota usage info
    ipcMain.handle("YOUTUBE_QUOTA_CHECK", async (_, apiKey) => {
        try {
            const url = new URL("https://www.googleapis.com/youtube/v3/videos");
            url.searchParams.append("part", "id");
            url.searchParams.append("id", "dQw4w9WgXcQ"); // Sample video
            url.searchParams.append("key", apiKey);

            const response = await fetch(url.toString());

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    valid: false,
                    error: errorData.error?.message || "Invalid API key"
                };
            }

            return {
                valid: true,
                message: "API key is valid"
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    });

    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

// Clean up cache periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of videoCache.entries()) {
        if (now - value.timestamp > CACHE_EXPIRY) {
            videoCache.delete(key);
        }
    }
}, CACHE_EXPIRY);