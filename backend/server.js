// backend/server.js
// Mira backend — proxies all FASHN calls so the API key never touches the phone.
//
// Pipelines:
//   /api/tryon        → tryon-max (personal render: your body + the garment)
//   /api/face-tryon   → product-to-model + face_reference (no body photo yet)
//   /api/mannequin    → tryon-max against a fixed neutral model image
//                       (uniform faceless catalog renders for the closet grid)
//   /api/model-photo  → reframe (normalize the body photo to 2:3, done ONCE
//                       when the user saves their model photo — not per try-on)
//
// All FASHN models are async: POST /v1/run → { id } → poll /v1/status/:id.
// tryon-max can take up to 120s, so we poll generously.

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '25mb' }));

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

// ---------------------------------------------------------------------------
// Mannequin image — the fixed neutral model every closet render uses.
// Priority: MANNEQUIN_IMAGE_URL env var → backend/assets/mannequin.jpg.
// Use a neck-down (head out of frame) full-body photo so closet cards read
// as "the look", not "a person". See README for setup.
// ---------------------------------------------------------------------------
function getMannequinImage() {
  if (process.env.MANNEQUIN_IMAGE_URL) return process.env.MANNEQUIN_IMAGE_URL;
  const file = path.join(__dirname, 'assets', 'mannequin.jpg');
  if (fs.existsSync(file)) {
    const b64 = fs.readFileSync(file).toString('base64');
    return `data:image/jpeg;base64,${b64}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Generic FASHN runner: submit + poll until completed/failed/timeout.
// ---------------------------------------------------------------------------
async function runFashn(modelName, inputs, { maxWaitMs = 150_000 } = {}) {
  const { data: submit } = await fashn.post('/run', {
    model_name: modelName,
    inputs,
  });

  const id = submit.id;
  if (!id) throw new Error(`No prediction id from FASHN (${modelName})`);

  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 2500));

    const { data: status } = await fashn.get(`/status/${id}`);

    if (status.status === 'completed') {
      const urls = status.output || [];
      if (!urls.length) throw new Error('Completed but no output images');
      return urls;
    }

    if (status.status === 'failed') {
      const err = new Error(status.error?.message || `FASHN ${modelName} failed`);
      err.fashnName = status.error?.name;
      throw err;
    }
    // starting / in_queue / processing → keep polling
  }

  throw new Error('Generation timed out');
}

const asDataUri = (b64) =>
  b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;

// --- Routes -----------------------------------------------------------------

app.get('/health', (_, res) =>
  res.json({ ok: true, mannequinConfigured: !!getMannequinImage() })
);

// Personal render: the user's body photo + a garment.
// tryon-max · quality · 2 variants → 6 credits per look.
app.post('/api/tryon', async (req, res) => {
  const { personImage, garmentImage } = req.body;
  if (!personImage || !garmentImage) {
    return res.status(400).json({ error: 'Both images required' });
  }

  try {
    const imageUrls = await runFashn('tryon-max', {
      model_image: asDataUri(personImage),
      product_image: asDataUri(garmentImage),
      generation_mode: 'quality',
      resolution: '1k',
      num_images: 1,
      output_format: 'jpeg',
    });
    res.json({ imageUrls });
  } catch (err) {
    console.error('tryon error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Face fallback: no body photo saved yet — generate an AI model wearing the
// garment, guided by the user's face. product-to-model + face_reference.
app.post('/api/face-tryon', async (req, res) => {
  const { faceImage, garmentImage } = req.body;
  if (!faceImage || !garmentImage) {
    return res.status(400).json({ error: 'Face and garment images required' });
  }

  try {
    const imageUrls = await runFashn('product-to-model', {
      product_image: asDataUri(garmentImage),
      face_reference: asDataUri(faceImage),
      face_reference_mode: 'match_reference',
      aspect_ratio: '2:3',
      generation_mode: 'balanced',
      resolution: '1k',
      num_images: 1,
      output_format: 'jpeg',
    });
    res.json({ imageUrls });
  } catch (err) {
    console.error('face-tryon error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Catalog render: garment on the fixed neutral mannequin model.
// Fired in the background after every successful generation so the closet
// grid stays visually uniform. tryon-max · balanced · 1 image → 2 credits.
app.post('/api/mannequin', async (req, res) => {
  const { garmentImage } = req.body;
  if (!garmentImage) {
    return res.status(400).json({ error: 'Garment image required' });
  }

  const mannequin = getMannequinImage();
  if (!mannequin) {
    return res.status(503).json({
      error:
        'No mannequin image configured. Set MANNEQUIN_IMAGE_URL or add backend/assets/mannequin.jpg',
    });
  }

  try {
    const imageUrls = await runFashn('tryon-max', {
      model_image: mannequin,
      product_image: asDataUri(garmentImage),
      generation_mode: 'balanced',
      resolution: '1k',
      num_images: 1,
      output_format: 'jpeg',
    });
    res.json({ imageUrl: imageUrls[0] });
  } catch (err) {
    console.error('mannequin error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// One-time body-photo normalization: reframe to 2:3 portrait so awkward
// real-world selfie crops don't degrade every future try-on.
// If the photo already fits 2:3 FASHN rejects the job — that's success for us.
app.post('/api/model-photo', async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Image required' });

  try {
    const imageUrls = await runFashn('reframe', {
      image: asDataUri(image),
      aspect_ratio: '2:3',
      generation_mode: 'balanced',
      resolution: '1k',
      num_images: 1,
      output_format: 'jpeg',
    });
    res.json({ imageUrl: imageUrls[0], reframed: true });
  } catch (err) {
    // "Image already matches target aspect ratio" → keep the original
    const already =
      err.fashnName === 'InputValidationError' ||
      /aspect ratio/i.test(err.message || '');
    if (already) return res.json({ imageUrl: null, reframed: false });

    console.error('model-photo error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Outfit: chain try-ons — apply the first garment to the model, then apply
// the second garment to that result. Two sequential generations (~6 credits).
// Accepts personImage (body pipeline) OR faceImage (face fallback pipeline).
app.post('/api/outfit', async (req, res) => {
  const { personImage, faceImage, garments } = req.body;
  if (!Array.isArray(garments) || garments.length < 1) {
    return res.status(400).json({ error: 'At least one garment required' });
  }
  if (!personImage && !faceImage) {
    return res.status(400).json({ error: 'personImage or faceImage required' });
  }

  try {
    // Pass 1: first garment onto the model
    let urls;
    if (personImage) {
      urls = await runFashn('tryon-max', {
        model_image: asDataUri(personImage),
        product_image: asDataUri(garments[0]),
        generation_mode: 'quality',
        resolution: '1k',
        num_images: 1,
        output_format: 'jpeg',
      });
    } else {
      urls = await runFashn('product-to-model', {
        product_image: asDataUri(garments[0]),
        face_reference: asDataUri(faceImage),
        face_reference_mode: 'match_reference',
        aspect_ratio: '2:3',
        generation_mode: 'balanced',
        resolution: '1k',
        num_images: 1,
        output_format: 'jpeg',
      });
    }

    // Pass 2+: each further garment onto the previous result (URL as model)
    for (let i = 1; i < garments.length; i++) {
      urls = await runFashn('tryon-max', {
        model_image: urls[0],
        product_image: asDataUri(garments[i]),
        generation_mode: 'quality',
        resolution: '1k',
        num_images: 1,
        output_format: 'jpeg',
      });
    }

    res.json({ imageUrls: urls });
  } catch (err) {
    console.error('outfit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
require('./stylist')(app);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mira backend running on :${PORT}`));
