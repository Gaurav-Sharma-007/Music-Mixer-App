import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { execFile, spawn } from "child_process";
import { promisify } from "util";

const require = createRequire(import.meta.url);
const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFilePromise = promisify(execFile);
const localPython = process.platform === "win32"
    ? path.join(__dirname, "../.venv/Scripts/python.exe")
    : path.join(__dirname, "../.venv/bin/python");
const pythonCommand = process.env.PYTHON ||
    (fs.existsSync(localPython) ? localPython : process.platform === "win32" ? "python" : "python3");
let mainWindow = null;

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");

// Cache for video metadata to reduce API calls
const videoCache = new Map();
const CACHE_EXPIRY = 3600000; // 1 hour in milliseconds

function getYoutubeVideoId(input) {
    const raw = input.trim();

    if (/^[\w-]{11}$/.test(raw)) {
        return raw;
    }

    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === "youtu.be") {
        return url.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
        const watchId = url.searchParams.get("v");
        if (watchId) {
            return watchId;
        }

        const [, route, id] = url.pathname.split("/");
        if (["shorts", "embed", "live"].includes(route)) {
            return id || null;
        }
    }

    return null;
}

function normalizeYoutubeUrl(input) {
    const videoId = getYoutubeVideoId(input);

    if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
        throw new Error("Invalid YouTube URL or video ID");
    }

    return `https://www.youtube.com/watch?v=${videoId}`;
}

function getBackendScriptPath() {
    return app.isPackaged
        ? path.join(process.resourcesPath, "backend", "server.py")
        : path.join(__dirname, "../backend/server.py");
}

function getStemRequirementsPath() {
    return app.isPackaged
        ? path.join(process.resourcesPath, "backend", "requirements-stems.txt")
        : path.join(__dirname, "../backend/requirements-stems.txt");
}

function getOptionalPackageBinary(packageName) {
    try {
        const packageExport = require(packageName);
        const binaryPath = typeof packageExport === "string" ? packageExport : packageExport?.path;
        if (!binaryPath) {
            return null;
        }

        const unpackedPath = binaryPath.replace("app.asar", "app.asar.unpacked");
        return fs.existsSync(unpackedPath) ? unpackedPath : binaryPath;
    } catch {
        return null;
    }
}

function buildBackendEnv() {
    const env = { ...process.env };
    const ffmpegPath = getOptionalPackageBinary("ffmpeg-static");
    const ffprobePath = getOptionalPackageBinary("ffprobe-static");
    const binaryDirs = [ffmpegPath, ffprobePath]
        .filter(Boolean)
        .map((binaryPath) => path.dirname(binaryPath));
    const uniqueBinaryDirs = [...new Set(binaryDirs)];

    if (uniqueBinaryDirs.length > 0) {
        env.PATH = [...uniqueBinaryDirs, env.PATH || ""].filter(Boolean).join(path.delimiter);
    }

    if (ffmpegPath) {
        env.BLANCDJ_FFMPEG_PATH = ffmpegPath;
    }

    if (ffprobePath) {
        env.BLANCDJ_FFPROBE_PATH = ffprobePath;
    }

    return env;
}

function formatBackendError(result, fallbackMessage) {
    const messageParts = [
        result?.error,
        result?.install_hint,
        result?.details ? `Details: ${result.details}` : null
    ].filter(Boolean);

    return messageParts.join("\n") || fallbackMessage;
}

function getYoutubeDownloadPath(videoId) {
    const downloadsDir = path.join(__dirname, "../downloads");
    fs.mkdirSync(downloadsDir, { recursive: true });
    return path.join(downloadsDir, `${videoId || Date.now()}-yt-dlp.mp3`);
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.cjs"),
            zoomFactor: 0.7,
            webSecurity: false
        },
        icon: path.join(__dirname, "../dist/logo.png")
    });

    if (!app.isPackaged) {
        win.loadURL("http://localhost:5173");
        if (process.env.OPEN_DEVTOOLS === "1") {
            win.webContents.openDevTools();
        }
    } else {
        win.loadFile(path.join(__dirname, "../dist/index.html"));
    }

    mainWindow = win;
    win.on("closed", () => {
        mainWindow = null;
    });

    return win;
}

app.whenReady().then(async () => {

    // Spawn Python Server
    const pythonScript = getBackendScriptPath();
    console.log("[Python] Spawning server at:", pythonScript);

    let pythonProcess = spawn(pythonCommand, [pythonScript], {
        env: buildBackendEnv()
    });

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

    ipcMain.handle("ANALYZE_STEMS", async (_, filePath) => {
        if (!filePath || typeof filePath !== "string") {
            throw new Error("A local audio file path is required for stem analysis.");
        }

        const response = await fetch("http://127.0.0.1:5000/stems/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_path: filePath })
        });

        const responseText = await response.text();
        let result = {};
        try {
            result = responseText ? JSON.parse(responseText) : {};
        } catch {
            result = { error: responseText || response.statusText };
        }

        if (!response.ok) {
            throw new Error(formatBackendError(result, "Stem analysis failed"));
        }

        return result;
    });

    ipcMain.handle("READ_AUDIO_FILE", async (_, filePath) => {
        if (!filePath || typeof filePath !== "string") {
            throw new Error("A file path is required.");
        }

        const buffer = fs.readFileSync(filePath);
        return new Uint8Array(buffer);
    });

    ipcMain.handle("INSTALL_STEM_REQUIREMENTS", async () => {
        const requirementsPath = getStemRequirementsPath();

        if (!fs.existsSync(requirementsPath)) {
            throw new Error(`Stem requirements file not found: ${requirementsPath}`);
        }

        const { stdout, stderr } = await execFilePromise(pythonCommand, [
            "-m",
            "pip",
            "install",
            "-r",
            requirementsPath
        ], {
            maxBuffer: 20 * 1024 * 1024,
            env: buildBackendEnv()
        });

        return {
            success: true,
            stdout,
            stderr
        };
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

            const url = normalizeYoutubeUrl(input);

            console.log("[YouTube] Normalized URL:", url);

            // Extract video ID for progress updates
            const videoId = getYoutubeVideoId(url);

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

                event.sender.send("YOUTUBE_DOWNLOAD_PROGRESS", { videoId, status: "complete", progress: 100 });

                return {
                    buffer: new Uint8Array(buffer),
                    title: result.title || "YouTube Track",
                    sourceFilePath: result.file_path
                };

            } catch (pythonError) {
                console.warn("[YouTube] Python server failed:", pythonError.message);
                event.sender.send("YOUTUBE_DOWNLOAD_PROGRESS", { videoId, status: "fallback", progress: 0 });

                // PRIORITY 2: YT-DLP FALLBACK (ONLY IF PYTHON FAILS)
                console.log("[YouTube] Falling back to yt-dlp...");

                // Resolve yt-dlp path
                let ytDlpPath = 'yt-dlp'; // Default to PATH on Linux/macOS
                if (app.isPackaged && process.platform === "win32") {
                    const bundledPath = path.join(process.resourcesPath, 'yt-dlp', 'yt-dlp.exe');
                    if (fs.existsSync(bundledPath)) {
                        ytDlpPath = bundledPath;
                    }
                } else if (!app.isPackaged && process.platform === "win32") {
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

                const fallbackFilePath = getYoutubeDownloadPath(videoId);
                if (fs.existsSync(fallbackFilePath)) {
                    fs.unlinkSync(fallbackFilePath);
                }

                await execFilePromise(ytDlpPath, [
                    url,
                    '-f', 'bestaudio/best',
                    '--extract-audio',
                    '--audio-format', 'mp3',
                    '--audio-quality', '0',
                    '--no-playlist',
                    '--no-warnings',
                    '-o', fallbackFilePath
                ], {
                    maxBuffer: 20 * 1024 * 1024
                });

                const buffer = fs.readFileSync(fallbackFilePath);

                if (buffer.length < 1000) {
                    throw new Error("yt-dlp buffer too small");
                }

                event.sender.send("YOUTUBE_DOWNLOAD_PROGRESS", { videoId, status: "complete", progress: 100 });
                return {
                    buffer: new Uint8Array(buffer),
                    title: videoTitle,
                    sourceFilePath: fallbackFilePath
                };
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
