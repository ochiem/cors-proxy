// api/tele-send.js
export const config = { api: { bodyParser: false } };

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');

    let payload;
    try { payload = JSON.parse(raw || '{}'); }
    catch { return res.status(400).json({ error: 'Invalid JSON' }); }

    const { chat_id, text, parse_mode, link_preview_options } = payload;
    if (!chat_id || !text) {
      return res.status(400).json({ error: 'chat_id & text required' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'Missing TELEGRAM_BOT_TOKEN in env' });
    }

    // Build body untuk Telegram API
    const body = {
      chat_id,
      text,
      parse_mode,
      link_preview_options: link_preview_options || { is_disabled: true }, // default disable preview
    };

    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await tg.json();
    if (!tg.ok) {
      return res.status(tg.status).json({ error: 'Telegram error', details: data });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Server error', details: e.message });
  }
}
