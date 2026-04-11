export default async function handler(req, res) {
  const API_KEY = process.env.JSONBIN_API_KEY;
  const BIN_ID  = process.env.JSONBIN_BIN_ID;

  const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  if (!API_KEY || !BIN_ID) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${BIN_URL}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });

      const data = await response.json();
      return res.status(200).json(data.record || []);
    }

    if (req.method === 'POST') {
      const newWish = req.body;

      if (!newWish.name || !newWish.message) {
        return res.status(400).json({ error: 'Missing fields' });
      }

      // Get current data
      const readRes = await fetch(`${BIN_URL}/latest`, {
        headers: { 'X-Master-Key': API_KEY }
      });

      const data = await readRes.json();
      const wishes = Array.isArray(data.record) ? data.record : [];

      wishes.push({
  id: crypto.randomUUID(),
  ...newWish,
  ts: Date.now()
});

      // Save updated array
      await fetch(BIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY,
          'X-Bin-Versioning': 'false'
        },
        body: JSON.stringify(wishes)
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).end();

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
