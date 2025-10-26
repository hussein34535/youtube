import { Innertube } from 'youtubei.js';

export default async function handler(req, res) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const query = req.url.split('?')[1];
    const params = new URLSearchParams(query);
    const url = params.get('url');

    if (!url) {
      return res.status(400).json({ error: 'Missing "url" parameter' });
    }

    const yt = await Innertube.create();
    const info = await yt.getInfo(url);
    
    const streams = (info.streaming_data?.formats || []).map(f => ({
      quality: f.quality_label,
      url: f.url,
      hasAudio: f.has_audio,
      hasVideo: f.has_video,
      container: f.mime_type?.split(';')[0]?.split('/')[1] || 'unknown',
      codecs: f.mime_type?.split('codecs="')[1]?.replace('"', '') || 'unknown',
      bitrate: f.bitrate,
      contentLength: f.content_length,
    }));

    if (streams.length === 0) {
      throw new Error('No playable streams found for this video. It may be private or age-restricted.');
    }

    return res.status(200).json({
      title: info.basic_info.title,
      author: info.basic_info.author,
      thumbnail: info.basic_info.thumbnail?.[0]?.url,
      streams: streams,
    });

  } catch (e) {
    console.error('[YouTube API Error]', e);
    return res.status(500).json({ error: e.message });
  }
}
