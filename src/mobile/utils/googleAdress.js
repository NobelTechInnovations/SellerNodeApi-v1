
import { AppError } from '../utils/index.js';

export const getCoordinates = async (address) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const encodedAddress = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.results[0];

    if (!result) {
      throw new Error('Unable to find location for the provided address');
    }

    const { lat, lng } = result.geometry.location;
    return {
      latitude: lat,
      longitude: lng
    };
  } catch (error) {
    console.error('Error fetching coordinates:', error.message);
    throw new AppError('Failed to fetch coordinates', 500);
  }
};

