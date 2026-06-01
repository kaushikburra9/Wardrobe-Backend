// backend/server.js
// Proxies try-on requests to Fashn API v1.6 using QUALITY mode + 2 samples.
// Quality mode produces noticeably better fabric/fit rendering than balanced.
// Returning 2 samples gives the user variants to pick from — one of them
// is usually clearly better, which makes the perceived quality much higher.

const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '20mb' }));

const FASHN_API = 'https://api.fashn.ai/v1';
const API_KEY = process.env.FASHN_API_KEY;

if (!API_KEY) {
  console.error('Missing FASHN_API_KEY in environment');
  process.exit(1);
}

const fashn = axios.create({
  baseURL: FASHN_API,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 45_000,
});

async function runTryOn({ modelImage, garmentImage, category }) {
  // Submit job
  const { data: submit } = await fashn.post('/run', {
    model_name: 'tryon-v1.6',
    inputs: {
      model_image: modelImage,
      garment_image: garmentImage,
      category: category || 'auto',
      mode: 'quality',           // ← was 'balanced'. quality gives noticeably better results
      garment_photo_type: 'auto',
      num_samples: 2,            // ← return 2 variants so the user can pick the better one
      segmentation_free: true,   // ← better preservation of skin/body when garment fits oddly
      output_format: 'png',
    },
  });

  const predictionId = submit.id;
  if (!predictionId) throw new Error('No prediction id from Fashn');

  // Poll — quality mode + 2 samples can take 20-40s, so poll up to 60s
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const { data: status } = await fashn.get(`/status/${predictionId}`);

    if (status.status === 'completed') {
      const urls = status.output || [];
      if (!urls.length) throw new Error('Completed but no output images');
      return urls;
    }

    if (status.status === 'failed') {
      throw new Error(status.error?.message || 'Fashn generation failed');
    }
    // otherwise: starting / in_queue / processing — keep polling
  }

  throw new Error('Generation timed out');
}

// --- Routes -----------------------------------------------------------------

app.get('/health', (_, res) => res.json({ ok: true }));

app.post('/api/tryon', async (req, res) => {
  const { personImage, garmentImage, category } = req.body;

  if (!personImage || !garmentImage) {
    return res.status(400).json({ error: 'Both images required' });
  }

  try {
    const imageUrls = await runTryOn({
      modelImage: `data:image/jpeg;base64,${personImage}`,
      garmentImage: `data:image/jpeg;base64,${garmentImage}`,
      category,
    });
    res.json({ imageUrls });
  } catch (err) {
    console.error('try-on error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mira backend running on :${PORT}`));
