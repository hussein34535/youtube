import ytdl from 'ytdl-core';

export default async function handler(req, res) {
  // Vercel Edge functions don't support searchParams, so we parse the URL manually
  const urlQuery = req.url.split('?')[1];
  const params = new URLSearchParams(urlQuery);
  const url = params.get('url');

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const info = await ytdl.getInfo(url);
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
      
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json({ title: info.videoDetails.title, streams: formats });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
