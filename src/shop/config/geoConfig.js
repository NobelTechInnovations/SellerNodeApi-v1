// Platform-wide bounds for buyer<->seller proximity matching (quick-commerce
// delivery model: buyers should only see sellers within a same-city range).
// Individual sellers configure their own `radius` on ServiceableZone
// (bounded to this same [MIN, MAX] range at onboarding), and geoService
// respects each seller's own value while never exceeding MAX_RADIUS_METERS.
export const GEO_CONFIG = {
  MIN_RADIUS_METERS: 20000, // 20km floor
  MAX_RADIUS_METERS: 50000, // 50km platform-wide cap
  DEFAULT_RADIUS_METERS: 20000,
};
