from flask import Flask, request, jsonify
from pytubefix import YouTube
import re
import os

app = Flask(__name__)

# Ensure downloads directory exists
DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

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
            video_id = url.split('v=')[1].split('&')[0]
            filename = f"{video_id}.{stream.subtype}"
            file_path = stream.download(output_path=DOWNLOAD_DIR, filename=filename)
            return True, file_path, yt.title
        else:
            return False, "No suitable stream found.", None
    except Exception as e:
        print(f"Download Error: {e}")
        return False, str(e), None

def is_valid_youtube_url(url):
    pattern = r"^(https?://)?(www\.)?youtube\.com/watch\?v=[\w-]+(&\S*)?$"
    return re.match(pattern, url) is not None

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

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    # Run on specific port 5000
    app.run(port=5000)
