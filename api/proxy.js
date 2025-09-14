// api/proxy.js
export const config = { api: { bodyParser: false } };

const ALLOWED_HOSTS = new Set([
  'api.telegram.org',
  'httpbin.org',
  // Tambah host yang kamu izinkan di sini
]);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // atau ganti dengan domain kamu
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization, x-requested-with');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const target = req.query.url;
    if (!target) return res.status(400).json({ error: 'Missing query param: url' });

    let u;
    try { u = new URL(target); } 
    catch { return res.status(400).json({ error: 'Invalid URL' }); }

    if (!ALLOWED_HOSTS.has(u.host)) {
      return res.status(403).json({ error: `Host not allowed: ${u.host}` });
    }

    // Kumpulkan body mentah (untuk semua method selain GET/HEAD)
    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    // Salin headers yang aman (biarkan content-length dihitung oleh fetch)
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      const key = k.toLowerCase();
      if (['host', 'content-length'].includes(key)) continue;
      headers[key] = v;
    }

    const upstream = await fetch(u.toString(), {
      method: req.method,
      headers,
      body,
    });

    // Teruskan status & sebagian besar headers upstream
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      const key = k.toLowerCase();
      if (['content-length', 'content-encoding'].includes(key)) return;
      res.setHeader(k, v);
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.end(buf);
  } catch (e) {
    return res.status(500).json({ error: 'Proxy failed', details: e.message });
  }
}
