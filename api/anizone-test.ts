export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  console.log(`[Anizone Test] Testing Phase 1... Initial URL: ${url}`);

  try {
    const upstreamRes = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      },
      // Note: Node 18 fetch follows redirects by default.
      redirect: 'follow'
    });

    console.log('[Anizone Test] --- UPSTREAM RESPONSE ---');
    console.log('[Anizone Test] Status:', upstreamRes.status, upstreamRes.statusText);
    console.log('[Anizone Test] Content-Type:', upstreamRes.headers.get('content-type'));
    console.log('[Anizone Test] Content-Length:', upstreamRes.headers.get('content-length'));
    console.log('[Anizone Test] Access-Control-Allow-Origin:', upstreamRes.headers.get('access-control-allow-origin'));
    console.log('[Anizone Test] Original Request URL:', url);
    console.log('[Anizone Test] Final Response URL (After Redirects):', upstreamRes.url);
    console.log('[Anizone Test] Was Redirected:', upstreamRes.redirected);
    console.log('[Anizone Test] All Headers:', Object.fromEntries(upstreamRes.headers.entries()));
    console.log('[Anizone Test] -----------------------------');

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Forward original headers that matter
    upstreamRes.headers.forEach((value, key) => {
      // Avoid forwarding encodings since we already decoded the body (fetch does this automatically)
      if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'content-length') {
        res.setHeader(key, value);
      }
    });
    
    // Set proper content-length and replace CORS
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    res.status(upstreamRes.status).send(buffer);
  } catch (err) {
    console.error('[Anizone Test] Proxy Error executing fetch:', err);
    res.status(500).json({ error: 'Internal Server Error: ' + (err.message || String(err)) });
  }
}

