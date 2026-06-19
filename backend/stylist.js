// backend/stylist.js
// AI stylist endpoint — sends the user's model photo (and optionally their
// wardrobe items) to Claude's vision model and returns styling guidance.
// Mount in server.js with:  require('./stylist')(app, { runFashn })  — or just
// require('./stylist')(app)  since it only needs axios + the API key.
//
// Requires ANTHROPIC_API_KEY in the environment (Railway env var). This is a
// SEPARATE key from FASHN — create it at console.anthropic.com.
//
// Two modes:
//   POST /api/stylist/advise  → { modelImage, itemImages?, question? }
//        free-form styling chat grounded in the person's actual photo
//   POST /api/stylist/build   → { modelImage, itemImages[] }
//        returns structured outfit suggestions built from their own pieces

const axios = require('axios');

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-8'; // vision-capable; swap to a cheaper tier if cost matters

function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Missing ANTHROPIC_API_KEY');
  return axios.create({
    baseURL: ANTHROPIC_API,
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    timeout: 60_000,
  });
}

// Turn a data URI or base64 string into an Anthropic image block.
function imageBlock(src) {
  let data = src;
  let media = 'image/jpeg';
  const m = /^data:(image\/\w+);base64,(.*)$/.exec(src);
  if (m) { media = m[1]; data = m[2]; }
  return { type: 'image', source: { type: 'base64', media_type: media, data } };
}

// Shared system framing — keep it constructive, additive, never body-critical.
const SYSTEM = `You are a warm, sharp personal stylist. You give specific, encouraging, practical advice grounded in what you actually see.

Rules:
- Be additive and constructive. Suggest what WILL work and look great; never tell someone a body type or feature is a flaw, and never say a piece is "unflattering."
- Ground advice in observable things: the colors in the photo, the garments shown, proportions, contrast. Talk about color harmony, silhouette balance, occasion-fit.
- Be specific ("a cream knit would warm up your complexion") not generic ("wear what makes you feel good").
- Style is personal and cultural — frame everything as a knowledgeable suggestion, never an objective verdict.
- Keep it concise and friendly. No medical, weight, or body-shape judgments.`;

module.exports = function mountStylist(app) {
  // Free-form advice grounded in the person's photo.
  app.post('/api/stylist/advise', async (req, res) => {
    const { modelImage, itemImages = [], question } = req.body;
    if (!modelImage) return res.status(400).json({ error: 'modelImage required' });

    const content = [imageBlock(modelImage)];
    itemImages.slice(0, 6).forEach((img) => content.push(imageBlock(img)));
    content.push({
      type: 'text',
      text:
        (itemImages.length
          ? 'The first image is the person. The rest are pieces from their wardrobe. '
          : 'This is the person. ') +
        (question?.trim()
          ? `They asked: "${question.trim()}"`
          : 'Give them three specific styling directions that would look great on them, with brief reasons.'),
    });

    try {
      const c = client();
      const { data } = await c.post('', {
        model: MODEL,
        max_tokens: 700,
        system: SYSTEM,
        messages: [{ role: 'user', content }],
      });
      const text = (data.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      res.json({ reply: text });
    } catch (err) {
      console.error('stylist/advise:', err.response?.data || err.message);
      res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
  });

  // Structured outfit suggestions built from the user's own pieces.
  app.post('/api/stylist/build', async (req, res) => {
    const { modelImage, itemImages = [] } = req.body;
    if (!modelImage || itemImages.length < 2) {
      return res.status(400).json({ error: 'modelImage and at least 2 itemImages required' });
    }

    const content = [imageBlock(modelImage)];
    itemImages.slice(0, 8).forEach((img) => content.push(imageBlock(img)));
    content.push({
      type: 'text',
      text:
        `The first image is the person. The remaining ${Math.min(itemImages.length, 8)} images are numbered pieces (1, 2, 3...) from their wardrobe in order. ` +
        `Propose up to 3 outfits using ONLY these pieces, chosen to flatter this specific person and to pair well together by color and silhouette. ` +
        `Respond ONLY with JSON, no prose, in this exact shape:\n` +
        `{"outfits":[{"pieces":[1,2],"why":"one short sentence on why it works for them"}]}`,
    });

    try {
      const c = client();
      const { data } = await c.post('', {
        model: MODEL,
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: 'user', content }],
      });
      const raw = (data.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .replace(/```json|```/g, '')
        .trim();
      let parsed;
      try { parsed = JSON.parse(raw); } catch { parsed = { outfits: [] }; }
      res.json(parsed);
    } catch (err) {
      console.error('stylist/build:', err.response?.data || err.message);
      res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
  });
};
