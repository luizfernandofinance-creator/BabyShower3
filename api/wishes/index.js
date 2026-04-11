export default async function handler(req, res) {
  const API_KEY = process.env.JSONBIN_API_KEY;
  const BIN_ID  = process.env.JSONBIN_BIN_ID;

  if (!API_KEY || !BIN_ID) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

  const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  try {

    // ======================
    // GET - load wishes
    // ======================
    if (req.method === "GET") {
      const response = await fetch(`${BIN_URL}/latest`, {
        headers: { "X-Master-Key": API_KEY }
      });

      const data = await response.json();
      return res.status(200).json(data.record || []);
    }

    // ======================
    // POST - add wish
    // ======================
    if (req.method === "POST") {
      const newWish = req.body;

      if (!newWish?.name || !newWish?.message) {
        return res.status(400).json({ error: "Missing name or message" });
      }

      const readRes = await fetch(`${BIN_URL}/latest`, {
        headers: { "X-Master-Key": API_KEY }
      });

      const data = await readRes.json();
      const wishes = Array.isArray(data.record) ? data.record : [];

      const wish = {
        id: crypto.randomUUID(),
        name: String(newWish.name).slice(0, 100),
        message: String(newWish.message).slice(0, 2000),
        location: String(newWish.location || "").slice(0, 100),
        lang: newWish.lang === "pt" ? "pt" : "en",
        photo: typeof newWish.photo === "string" ? newWish.photo : "",
        video: typeof newWish.video === "string" ? newWish.video : "",
        ts: Date.now()
      };

      wishes.push(wish);

      await fetch(BIN_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": API_KEY,
          "X-Bin-Versioning": "false"
        },
        body: JSON.stringify(wishes)
      });

      return res.status(201).json({ success: true });
    }

    // ======================
    // DELETE - remove wish
    // ======================
    if (req.method === "DELETE") {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }

      const readRes = await fetch(`${BIN_URL}/latest`, {
        headers: { "X-Master-Key": API_KEY }
      });

      const data = await readRes.json();
      let wishes = Array.isArray(data.record) ? data.record : [];

      wishes = wishes.filter(w => w.id !== id);

      await fetch(BIN_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": API_KEY,
          "X-Bin-Versioning": "false"
        },
        body: JSON.stringify(wishes)
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}  const { id } = req.body;

  const readRes = await fetch(`${BIN_URL}/latest`, {
    headers: { 'X-Master-Key': API_KEY }
  });

  const data = await readRes.json();
  let wishes = Array.isArray(data.record) ? data.record : [];

  wishes = wishes.filter(w => w.id !== id);

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
if (req.method === 'DELETE') {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }

  const readRes = await fetch(`${BIN_URL}/latest`, {
    headers: { 'X-Master-Key': API_KEY }
  });

  const data = await readRes.json();
  let wishes = Array.isArray(data.record) ? data.record : [];

  wishes = wishes.filter(w => w.id !== id);

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
