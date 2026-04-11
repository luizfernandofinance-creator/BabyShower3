// api/wishes.js — Vercel serverless function
// Proxies requests to JSONBin so credentials stay server-side
// and CORS is never a problem.

const API_KEY = process.env.JSONBIN_API_KEY;
const BIN_ID  = process.env.JSONBIN_BIN_ID;
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

export default async function handler(req, res) {
  // Allow requests from any origin (your Vercel domain)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // ── READ all wishes ──────────────────────────────────────
      const response = await fetch(`${BIN_URL}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('JSONBin read failed:', response.status, text);
        return res.status(502).json({ error: 'Failed to load wishes', detail: text });
      }

      const data = await response.json();
      const wishes = Array.isArray(data.record) ? data.record : [];
      return res.status(200).json(wishes);

    } else if (req.method === 'POST') {
      // ── APPEND a new wish ────────────────────────────────────
      const newWish = req.body;

      // Validate required fields
      if (!newWish || !newWish.name || !newWish.message) {
        return res.status(400).json({ error: 'name and message are required' });
      }

      // Sanitise — strip unknown fields, enforce limits
      const wish = {
        name:     String(newWish.name    || '').slice(0, 100),
        message:  String(newWish.message || '').slice(0, 2000),
        location: String(newWish.location|| '').slice(0, 100),
        lang:     newWish.lang === 'pt' ? 'pt' : 'en',
        photo:    typeof newWish.photo === 'string' ? newWish.photo : '',
        video:    typeof newWish.video === 'string' ? newWish.video : '',
        ts:       Date.now()
      };

      // Read current list
      const readRes = await fetch(`${BIN_URL}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });

      if (!readRes.ok) {
        return res.status(502).json({ error: 'Could not read existing wishes' });
      }

      const data    = await readRes.json();
      const wishes  = Array.isArray(data.record) ? data.record : [];

      // Append and write back
      wishes.push(wish);

      const writeRes = await fetch(BIN_URL, {
        method:  'PUT',
        headers: {
          'Content-Type':    'application/json',
          'X-Master-Key':    API_KEY,
          'X-Bin-Versioning':'false'
        },
        body: JSON.stringify(wishes)
      });

      if (!writeRes.ok) {
        const text = await writeRes.text();
        console.error('JSONBin write failed:', writeRes.status, text);
        return res.status(502).json({ error: 'Failed to save wish', detail: text });
      }

      return res.status(201).json({ ok: true, total: wishes.length });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
