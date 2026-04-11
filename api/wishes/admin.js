// api/admin.js — Admin serverless function (CommonJS)
// Handles all admin operations: auth, delete, edit, block, moderate uploads

const API_KEY    = process.env.JSONBIN_API_KEY;
const BIN_ID     = process.env.JSONBIN_BIN_ID;
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'daniel2025';
const BIN_URL    = 'https://api.jsonbin.io/v3/b/' + BIN_ID;

// Simple token store (in-memory — resets on cold start, good enough for admin panel)
const VALID_TOKENS = new Set();

function generateToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function isAuthed(req) {
  const auth = req.headers['x-admin-token'] || '';
  return VALID_TOKENS.has(auth);
}

async function readWishes() {
  const res = await fetch(BIN_URL + '/latest', {
    headers: { 'X-Master-Key': API_KEY }
  });
  if (!res.ok) throw new Error('Read failed: ' + res.status);
  const data = await res.json();
  return Array.isArray(data.record) ? data.record : [];
}

async function writeWishes(wishes) {
  const res = await fetch(BIN_URL, {
    method: 'PUT',
    headers: {
      'Content-Type':     'application/json',
      'X-Master-Key':     API_KEY,
      'X-Bin-Versioning': 'false'
    },
    body: JSON.stringify(wishes)
  });
  if (!res.ok) throw new Error('Write failed: ' + res.status);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (action === 'login') {
    if (req.method !== 'POST') return res.status(405).end();
    const { password } = req.body || {};
    if (password === ADMIN_PASS) {
      const token = generateToken();
      VALID_TOKENS.add(token);
      // Expire token after 4 hours
      setTimeout(function() { VALID_TOKENS.delete(token); }, 4 * 60 * 60 * 1000);
      return res.status(200).json({ ok: true, token });
    }
    return res.status(401).json({ error: 'Incorrect password' });
  }

  // All other actions require auth
  if (!isAuthed(req)) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  try {
    // ── GET ALL WISHES ───────────────────────────────────────────────────────
    if (action === 'list' && req.method === 'GET') {
      const wishes = await readWishes();
      return res.status(200).json(wishes);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (action === 'delete' && req.method === 'POST') {
      const { ts } = req.body;
      let wishes = await readWishes();
      const before = wishes.length;
      wishes = wishes.filter(function(w) { return w.ts !== ts; });
      if (wishes.length === before) return res.status(404).json({ error: 'Wish not found' });
      await writeWishes(wishes);
      return res.status(200).json({ ok: true, remaining: wishes.length });
    }

    // ── EDIT MESSAGE ─────────────────────────────────────────────────────────
    if (action === 'edit' && req.method === 'POST') {
      const { ts, message, name, location } = req.body;
      const wishes = await readWishes();
      const idx = wishes.findIndex(function(w) { return w.ts === ts; });
      if (idx === -1) return res.status(404).json({ error: 'Wish not found' });
      if (message  !== undefined) wishes[idx].message  = String(message).slice(0, 2000);
      if (name     !== undefined) wishes[idx].name     = String(name).slice(0, 100);
      if (location !== undefined) wishes[idx].location = String(location).slice(0, 100);
      wishes[idx].edited = true;
      await writeWishes(wishes);
      return res.status(200).json({ ok: true, wish: wishes[idx] });
    }

    // ── BLOCK / UNBLOCK (hides from public wall) ──────────────────────────────
    if (action === 'block' && req.method === 'POST') {
      const { ts, blocked } = req.body;
      const wishes = await readWishes();
      const idx = wishes.findIndex(function(w) { return w.ts === ts; });
      if (idx === -1) return res.status(404).json({ error: 'Wish not found' });
      wishes[idx].blocked = blocked !== false; // default true
      await writeWishes(wishes);
      return res.status(200).json({ ok: true, blocked: wishes[idx].blocked });
    }

    // ── MODERATE UPLOAD (remove photo or video) ──────────────────────────────
    if (action === 'moderate' && req.method === 'POST') {
      const { ts, removePhoto, removeVideo } = req.body;
      const wishes = await readWishes();
      const idx = wishes.findIndex(function(w) { return w.ts === ts; });
      if (idx === -1) return res.status(404).json({ error: 'Wish not found' });
      if (removePhoto) wishes[idx].photo = '';
      if (removeVideo) wishes[idx].video = '';
      wishes[idx].moderated = true;
      await writeWishes(wishes);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (err) {
    console.error('Admin API error:', err);
    return res.status(500).json({ error: err.message });
  }
};
