from flask import Flask, request, jsonify
from pytubefix import YouTube
import hashlib
import importlib.util
import re
import os
import shutil
import subprocess
import sys
from urllib.parse import parse_qs, urlparse

app = Flask(__name__)

# Ensure downloads directory exists
DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
STEM_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "stems")
os.makedirs(STEM_CACHE_DIR, exist_ok=True)
STEM_NAMES = ("vocals", "drums", "bass", "other")
STEM_OUTPUT_FORMAT = os.environ.get("BLANCDJ_STEM_FORMAT", "mp3").lower().lstrip(".")
STEM_FILE_EXTENSIONS = tuple(dict.fromkeys((STEM_OUTPUT_FORMAT, "mp3", "wav", "flac")))
DEMUCS_MODEL = os.environ.get("BLANCDJ_STEM_MODEL", "htdemucs")
STEM_TIMEOUT_SECONDS = int(os.environ.get("BLANCDJ_STEM_TIMEOUT_SECONDS", "1800"))
FFMPEG_ENV_VAR = "BLANCDJ_FFMPEG_PATH"
FFPROBE_ENV_VAR = "BLANCDJ_FFPROBE_PATH"

def download_video_audio(url):
    try:
        yt = YouTube(url)
        print(f"Processing: {yt.title}")
        
        # Priority 1: Audio-only stream (m4a/webm) - fastest and smallest
        stream = yt.streams.filter(only_audio=True).order_by('abr').desc().first()
        
        if not stream:
            # Priority 2: Progressive mp4 (video+audio)
            stream = yt.streams.filter(progressive=True, file_extension='mp4').order_by('resolution').desc().first()
            
        if stream:
            print(f"Downloading stream: {stream}")
            # Download to the specific downloads folder
            # We use the video ID as filename to avoid duplicates/special char issues
            video_id = get_youtube_video_id(url)
            if not video_id:
                return False, "Invalid YouTube URL", None

            filename = f"{video_id}.{stream.subtype}"
            target_path = os.path.join(DOWNLOAD_DIR, filename)
            if os.path.exists(target_path):
                os.remove(target_path)

            file_path = stream.download(output_path=DOWNLOAD_DIR, filename=filename)
            return True, file_path, yt.title
        else:
            return False, "No suitable stream found.", None
    except Exception as e:
        print(f"Download Error: {e}")
        return False, str(e), None

def is_valid_youtube_url(url):
    video_id = get_youtube_video_id(url)
    return video_id is not None and re.match(r"^[\w-]{11}$", video_id) is not None

def get_youtube_video_id(url):
    raw = url.strip()
    if re.match(r"^[\w-]{11}$", raw):
        return raw

    parsed = urlparse(raw if raw.startswith(("http://", "https://")) else f"https://{raw}")
    host = parsed.hostname or ""
    host = host.removeprefix("www.").lower()

    if host == "youtu.be":
        return parsed.path.strip("/").split("/")[0] or None

    if host == "youtube.com" or host.endswith(".youtube.com"):
        query_id = parse_qs(parsed.query).get("v", [None])[0]
        if query_id:
            return query_id

        path_parts = [part for part in parsed.path.split("/") if part]
        if len(path_parts) >= 2 and path_parts[0] in {"shorts", "embed", "live"}:
            return path_parts[1]

    return None

def get_demucs_command():
    demucs_executable = shutil.which("demucs")
    if demucs_executable:
        return [demucs_executable]

    if importlib.util.find_spec("demucs"):
        return [sys.executable, "-m", "demucs"]

    return None

def get_executable_path(binary_name, env_var):
    configured_path = os.environ.get(env_var)
    if configured_path and os.path.isfile(configured_path):
        return configured_path

    return shutil.which(binary_name)

def get_stem_dependency_status():
    demucs_command = get_demucs_command()
    ffmpeg_path = get_executable_path("ffmpeg", FFMPEG_ENV_VAR)
    ffprobe_path = get_executable_path("ffprobe", FFPROBE_ENV_VAR)

    return {
        "available": demucs_command is not None and ffmpeg_path is not None and ffprobe_path is not None,
        "demucs_available": demucs_command is not None,
        "ffmpeg_available": ffmpeg_path is not None,
        "ffprobe_available": ffprobe_path is not None,
        "demucs_command": demucs_command,
        "ffmpeg_path": ffmpeg_path,
        "ffprobe_path": ffprobe_path
    }

def build_stem_subprocess_env(ffmpeg_path=None, ffprobe_path=None):
    env = os.environ.copy()
    binary_dirs = []

    for binary_path in (ffmpeg_path, ffprobe_path):
        if binary_path:
            binary_dir = os.path.dirname(binary_path)
            if binary_dir and binary_dir not in binary_dirs:
                binary_dirs.append(binary_dir)

    if binary_dirs:
        env["PATH"] = os.pathsep.join([*binary_dirs, env.get("PATH", "")])

    return env

def get_ffmpeg_install_hint():
    return (
        "FFmpeg and FFprobe are required for stem analysis. "
        "Install system FFmpeg or restart the Electron app after npm install so the bundled binaries are available."
    )

def get_stem_failure_hint(details):
    lower_details = details.lower()

    if "torchcodec" in lower_details:
        return "Install optional stem support with: pip install -r backend/requirements-stems.txt"

    if "ffmpeg is not installed" in lower_details or "ffprobe" in lower_details:
        return get_ffmpeg_install_hint()

    return None

def stem_cache_id(file_path):
    stat = os.stat(file_path)
    fingerprint = f"{os.path.abspath(file_path)}:{stat.st_size}:{stat.st_mtime_ns}"
    return hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()[:24]

def find_stem_paths(job_dir):
    if not os.path.isdir(job_dir):
        return None

    for root, _, files in os.walk(job_dir):
        by_name = {file_name.lower(): os.path.join(root, file_name) for file_name in files}
        stems = {}
        for stem in STEM_NAMES:
            for extension in STEM_FILE_EXTENSIONS:
                file_name = f"{stem}.{extension}"
                if file_name in by_name:
                    stems[stem] = by_name[file_name]
                    break

        if all(stem in stems for stem in STEM_NAMES):
            return stems

    return None

def add_stem_output_format_args(command):
    if STEM_OUTPUT_FORMAT == "mp3":
        command.extend(["--mp3", "--mp3-bitrate", "320"])
    elif STEM_OUTPUT_FORMAT == "flac":
        command.append("--flac")

def tail_output(text, max_lines=18):
    if not text:
        return ""
    return "\n".join(text.strip().splitlines()[-max_lines:])

@app.route('/download', methods=['POST'])
def download_route():
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "Missing 'url' parameter"}), 400

    if not is_valid_youtube_url(url):
        return jsonify({"error": "Invalid YouTube URL"}), 400
    
    success, result, title = download_video_audio(url)
    
    if success:
        return jsonify({
            "message": "Download successful",
            "file_path": result,
            "title": title
        }), 200
    else:
        return jsonify({"error": result}), 500

@app.route('/stems/status', methods=['GET'])
def stems_status():
    dependency_status = get_stem_dependency_status()

    return jsonify({
        "available": dependency_status["available"],
        "demucs_available": dependency_status["demucs_available"],
        "ffmpeg_available": dependency_status["ffmpeg_available"],
        "ffprobe_available": dependency_status["ffprobe_available"],
        "model": DEMUCS_MODEL,
        "install_hint": (
            "Install optional stem support with: pip install -r backend/requirements-stems.txt. "
            "FFmpeg and FFprobe must also be available."
        )
    }), 200

@app.route('/stems/analyze', methods=['POST'])
def analyze_stems_route():
    data = request.get_json() or {}
    file_path = data.get('file_path')

    if not file_path:
        return jsonify({"error": "Missing 'file_path' parameter"}), 400

    file_path = os.path.abspath(file_path)
    if not os.path.isfile(file_path):
        return jsonify({"error": "Audio file not found"}), 404

    dependency_status = get_stem_dependency_status()
    demucs_command = dependency_status["demucs_command"]
    if demucs_command is None:
        return jsonify({
            "error": "Stem separation is not installed.",
            "install_hint": "Install optional offline stem support with: pip install -r backend/requirements-stems.txt"
        }), 503

    if not dependency_status["ffmpeg_available"] or not dependency_status["ffprobe_available"]:
        return jsonify({
            "error": "FFmpeg is not available for stem analysis.",
            "install_hint": get_ffmpeg_install_hint()
        }), 503

    job_id = stem_cache_id(file_path)
    job_dir = os.path.join(STEM_CACHE_DIR, job_id)
    cached_stems = find_stem_paths(job_dir)
    if cached_stems:
        return jsonify({
            "message": "Cached stems ready",
            "cached": True,
            "model": DEMUCS_MODEL,
            "stems": cached_stems
        }), 200

    os.makedirs(job_dir, exist_ok=True)
    command = [
        *demucs_command,
        "--name", DEMUCS_MODEL,
        "--out", job_dir,
    ]
    add_stem_output_format_args(command)
    command.append(file_path)

    print(f"[Stems] Running: {' '.join(command)}")
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=STEM_TIMEOUT_SECONDS,
            check=False,
            env=build_stem_subprocess_env(
                dependency_status["ffmpeg_path"],
                dependency_status["ffprobe_path"]
            )
        )
    except subprocess.TimeoutExpired:
        return jsonify({
            "error": f"Stem analysis timed out after {STEM_TIMEOUT_SECONDS} seconds."
        }), 504
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    if completed.returncode != 0:
        details = tail_output(completed.stderr) or tail_output(completed.stdout)
        response = {
            "error": "Stem analysis failed.",
            "details": details
        }
        install_hint = get_stem_failure_hint(details)
        if install_hint:
            response["install_hint"] = install_hint
        return jsonify(response), 500

    stems = find_stem_paths(job_dir)
    if not stems:
        details = tail_output(completed.stdout) or tail_output(completed.stderr)
        return jsonify({
            "error": "Stem analysis finished but no stem files were found.",
            "details": details
        }), 500

    return jsonify({
        "message": "Stem analysis complete",
        "cached": False,
        "model": DEMUCS_MODEL,
        "stems": stems
    }), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    # Run on specific port 5000
    app.run(port=5000)
