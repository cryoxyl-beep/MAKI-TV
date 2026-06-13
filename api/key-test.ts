export default async function handler(req: any, res: any) {
  const url = "https://seiryuu.vid-cdn.xyz/5cb3010b-4428-4d9e-9d3c-775c302558c8/keys/po1IClHz.key";

  console.log(`[Key Test] Fetching: ${url}`);

  try {
    const upstreamRes = await fetch(url.toString(), {
      headers: {
        'Referer': 'https://anizone.to/',
        'Origin': 'https://anizone.to',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      },
      redirect: 'follow'
    });

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('[Key Test] --- UPSTREAM RESPONSE ---');
    console.log('[Key Test] Status:', upstreamRes.status, upstreamRes.statusText);
    console.log('[Key Test] Content-Type:', upstreamRes.headers.get('content-type'));
    console.log('[Key Test] cf-ray:', upstreamRes.headers.get('cf-ray'));
    console.log('[Key Test] server:', upstreamRes.headers.get('server'));
    console.log('[Key Test] All Headers:', Object.fromEntries(upstreamRes.headers.entries()));
    const bodyStr = buffer.toString('utf-8');
    
    console.log('[Key Test] First 500 chars of Body:', bodyStr.slice(0, 500));
    console.log('[Key Test] -----------------------------');

    res.status(200).json({
      status_code: upstreamRes.status,
      content_length: buffer.length,
      content_type: upstreamRes.headers.get('content-type')
    });
  } catch (err: any) {
    console.error('[Key Test] Error executing fetch:', err);
    res.status(500).json({ error: 'Internal Server Error: ' + (err.message || String(err)) });
  }
}
