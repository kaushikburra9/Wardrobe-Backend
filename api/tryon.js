import axios from 'axios';
import Constants from 'expo-constants';

// Read from app config so it can differ between dev / prod
const BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  'http://localhost:3000';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000, // try-on can take up to 17s; pad generously
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Generate a virtual try-on.
 *
 * @param {string} personBase64  — base64-encoded photo of the user (no data: prefix)
 * @param {string} garmentBase64 — base64-encoded photo of the garment
 * @returns {Promise<string>}    — URL of the generated image
 */
export async function generateTryOn(personBase64, garmentBase64) {
  try {
    const { data } = await client.post('/api/tryon', {
      personImage: personBase64,
      garmentImage: garmentBase64,
    });

    if (!data?.imageUrl) {
      throw new Error('No image returned');
    }
    return data.imageUrl;
  } catch (err) {
    const message =
      err.response?.data?.error ||
      err.message ||
      'Try-on failed — please try again';
    throw new Error(message);
  }
}

/**
 * Two-step combo: top first, then bottom on the result.
 * Each step is one API call, so this costs 2x credits.
 */
export async function generateOutfitCombo(personBase64, topBase64, bottomBase64) {
  // Step 1 — top on person
  const stepOneUrl = await generateTryOn(personBase64, topBase64);

  // Step 2 — bottom on step one's result
  // Backend fetches the image URL, re-encodes, calls Fashn again
  try {
    const { data } = await client.post('/api/tryon-from-url', {
      personImageUrl: stepOneUrl,
      garmentImage: bottomBase64,
    });
    if (!data?.imageUrl) throw new Error('No image returned');
    return data.imageUrl;
  } catch (err) {
    const message =
      err.response?.data?.error ||
      err.message ||
      'Combo step failed';
    throw new Error(message);
  }
}
