import ytdl from 'ytdl-core';

// Simple in-memory cache (optional, resets when function reloads)
const cache = new Map();

export default async function handler(req, res) {
  try {
    // Parse query manually
    const query = req.url.split('?')[1];
    const params = new URLSearchParams(query);
    const url = params.get('url');

    // Handle OPTIONS (CORS preflight)
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(204).end();
    }

    // Missing URL
    if (!url) {
      return res.status(400).json({ error: 'Missing "url" parameter' });
    }

    // Validate that it's a YouTube URL
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Check cache
    if (cache.has(url)) {
      const cached = cache.get(url);
      if (Date.now() - cached.time < 5 * 60 * 1000) { // 5 minute cache
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json(cached.data);
      } else {
        cache.delete(url);
      }
    }

    // Fetch video info with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 seconds max
    const info = await ytdl.getInfo(url, { requestOptions: { signal: controller.signal } });
    clearTimeout(timeout);

    const formats = info.formats
      .filter(f => f.url)
      .map(f => ({
        quality: f.qualityLabel,
        url: f.url,
        hasAudio: f.hasAudio,
        hasVideo: f.hasVideo,
        container: f.container,
        codecs: f.codecs,
        bitrate: f.bitrate,
        contentLength: f.contentLength,
      }));

    const responseData = {
      title: info.videoDetails.title,
      author: info.videoDetails.author?.name,
      thumbnail: info.videoDetails.thumbnails?.pop()?.url,
      streams: formats,
    };

    // Cache response
    cache.set(url, { data: responseData, time: Date.now() });

    // Send CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json(responseData);

  } catch (err) {
    console.error('[YouTube API Error]', err);
    const message =
      err.name === 'AbortError'
        ? 'Request timed out while fetching YouTube info'
        : err.message;
        
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: message });
  }
}
