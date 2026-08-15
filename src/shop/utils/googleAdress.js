import { AppError } from './index.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

async function getCoordinatesFromGoogle(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const encodedAddress = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.status !== 'OK') {
    // REQUEST_DENIED (billing disabled / bad key), ZERO_RESULTS, etc. —
    // don't throw, just fall through to the free fallback below.
    console.warn(`Google geocoding returned "${data.status}" for "${address}" — falling back to OpenStreetMap.`);
    return null;
  }

  const result = data.results[0];
  if (!result) return null;

  const { lat, lng } = result.geometry.location;
  return { latitude: lat, longitude: lng };
}

// Free, no-API-key fallback (OpenStreetMap Nominatim) — used whenever
// Google's key is unset, billing-disabled, or quota-exhausted, so pincode
// resolution keeps working for dev/testing without depending on Google
// Cloud billing being set up. Usage policy requires a descriptive
// User-Agent and caps around 1 req/sec, which is fine for an
// interactive "resolve on submit" call like this one.
async function getCoordinatesFromNominatim(address) {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=in`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'GenieZy-Marketplace-Dev/1.0 (location resolve fallback)' },
  });
  if (!response.ok) return null;

  const data = await response.json();
  const result = data[0];
  if (!result) return null;

  return { latitude: parseFloat(result.lat), longitude: parseFloat(result.lon) };
}

export const getCoordinates = async (address) => {
  try {
    const googleResult = await getCoordinatesFromGoogle(address).catch((err) => {
      console.error('Google geocoding error:', err.message);
      return null;
    });
    if (googleResult) return googleResult;

    const osmResult = await getCoordinatesFromNominatim(address);
    if (osmResult) return osmResult;

    throw new Error('Unable to find location for the provided address');
  } catch (error) {
    console.error('Error fetching coordinates:', error.message);
    throw new AppError('Failed to fetch coordinates', 500);
  }
};
