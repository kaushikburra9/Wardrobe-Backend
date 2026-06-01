// backend/server.js
// Lightweight Express server that proxies try-on requests to Fashn v1.6.
// Why a backend at all? We never want the Fashn API key on the client.

const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '15mb' })); // base64 photos are large

const FASHN_API = 'https://api.fashn.ai/v1';
const API_KEY = process.env.FASHN_API_KEY;

if (!API_KEY) {
  console.error('Missing FASHN_API_KEY in environment');
  process.exit(1);
}

const fashnClient = axios.create({
  baseURL: FASHN_API,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

/**
 * Submit a try-on job and poll until completion.
 * @param {string} modelImage   — data URI or http URL
 * @param {string} garmentImage — data URI or http URL
 * @returns {Promise<string>}   — URL of the generated image
 */
async function runTryOn(modelImage, garmentImage) {
  // 1. Submit
  const { data: submission } = await fashnClient.post('/run', {
    model_name: 'tryon-v1.6',
    inputs: {
      model_image: modelImage,
      garment_image: garmentImage,
      category: 'auto',
      mode: 'balanced',
      garment_photo_type: 'auto',
    },
  });

  const predictionId = submission.id;
  if (!predictionId) {
    throw new Error('Fashn did not return a prediction id');
  }

  // 2. Poll — every 2s, max ~24s of total wait
  const maxAttempts = 12;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));

    const { data: status } = await fashnClient.get(`/status/${predictionId}`);

    if (status.status === 'completed') {
      const url = status.output?.[0];
      if (!url) throw new Error('Completed but no output image');
      return url;
    }

    if (status.status === 'failed') {
      throw new Error(status.error?.message || 'Fashn generation failed');
    }
    // otherwise "starting" or "in_queue" or "processing" — keep polling
  }

  throw new Error('Generation timed out');
}

// --- Routes -----------------------------------------------------------------

app.get('/health', (_, res) => res.json({ ok: true }));

/**
 * POST /api/tryon
 * Body: { personImage: base64, garmentImage: base64 }
 */
app.post('/api/tryon', async (req, res) => {
  const { personImage, garmentImage } = req.body;

  if (!personImage || !garmentImage) {
    return res.status(400).json({ error: 'Both images required' });
  }

  try {
    const imageUrl = await runTryOn(
      `data:image/jpeg;base64,${personImage}`,
      `data:image/jpeg;base64,${garmentImage}`
    );
    res.json({ imageUrl });
  } catch (err) {
    console.error('try-on error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tryon-from-url
 * Used for combo step 2 — first result is a URL, garment is still base64.
 * Body: { personImageUrl: string, garmentImage: base64 }
 */
app.post('/api/tryon-from-url', async (req, res) => {
  const { personImageUrl, garmentImage } = req.body;

  if (!personImageUrl || !garmentImage) {
    return res.status(400).json({ error: 'Both inputs required' });
  }

  try {
    const imageUrl = await runTryOn(
      personImageUrl,
      `data:image/jpeg;base64,${garmentImage}`
    );
    res.json({ imageUrl });
  } catch (err) {
    console.error('combo step error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Wardrobe backend running on :${PORT}`);
});
