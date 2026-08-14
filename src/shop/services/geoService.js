import ServiceableZone from '../../models/admin/ServiceableZone.js';
import ProductSellerSKU from '../../models/products/productSellerSku.js';
import RedisClient from '../../../redis-client.js';
import { GEO_CONFIG } from '../config/geoConfig.js';

// Round to ~1.1km grid cells so nearby requests share a cache key without
// needing exact-coordinate matches (a buyer's location doesn't change
// between page loads, so this cache mostly just saves the aggregation on
// back-to-back category browses).
const CACHE_TTL_SECONDS = 300;
function cacheKeyFor(lat, lng) {
  const round = (n) => Math.round(Number(n) * 100) / 100;
  return `geo:sellers:${round(lat)}:${round(lng)}`;
}

/**
 * Find sellers whose ServiceableZone covers the given buyer location,
 * respecting each seller's own configured radius but never exceeding the
 * platform-wide MAX_RADIUS_METERS cap.
 * @returns {Promise<string[]>} seller_id strings
 */
export async function getEligibleSellerIds(lat, lng) {
  if (lat == null || lng == null) return null; // no location -> caller should skip geo filtering entirely

  const cacheKey = cacheKeyFor(lat, lng);
  try {
    const cached = await RedisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn(`[geoService] cache GET failed (falling back to DB): ${err?.message || err}`);
  }

  const zones = await ServiceableZone.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        distanceField: 'distance_meters',
        maxDistance: GEO_CONFIG.MAX_RADIUS_METERS, // hard platform cap, applied first for index efficiency
        spherical: true,
        query: { is_active: true, status: 'active' },
      },
    },
    // Respect each seller's own configured radius (never exceeds the cap
    // above since $geoNear already excluded anything beyond MAX_RADIUS_METERS).
    { $match: { $expr: { $lte: ['$distance_meters', '$radius'] } } },
    { $project: { seller_id: 1 } },
  ]);

  const sellerIds = zones.map((z) => z.seller_id.toString());

  try {
    await RedisClient.set(cacheKey, JSON.stringify(sellerIds), { EX: CACHE_TTL_SECONDS });
  } catch (err) {
    console.warn(`[geoService] cache SET failed (ignored): ${err?.message || err}`);
  }

  return sellerIds;
}

/**
 * Map a set of eligible seller ids to the product_ids they sell.
 * @returns {Promise<string[]>} product_id strings (Product.product_id business key)
 */
export async function getEligibleProductIds(sellerIds) {
  if (!sellerIds || sellerIds.length === 0) return [];
  const rows = await ProductSellerSKU.find(
    { seller_id: { $in: sellerIds } },
    { product_id: 1 }
  ).lean();
  return [...new Set(rows.map((r) => r.product_id))];
}

/**
 * Convenience combining both steps: buyer lat/lng -> eligible product_ids.
 * Returns `null` (not an empty array) when lat/lng are absent, so callers
 * can distinguish "no location supplied, don't filter" from "location
 * supplied but zero sellers/products found nearby".
 */
export async function getEligibleProductIdsForLocation(lat, lng) {
  const sellerIds = await getEligibleSellerIds(lat, lng);
  if (sellerIds === null) return null;
  return getEligibleProductIds(sellerIds);
}

export default { getEligibleSellerIds, getEligibleProductIds, getEligibleProductIdsForLocation };
