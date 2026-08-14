/**
 * One-off, manual backfill: creates a ServiceableZone (at the new 20km
 * floor radius) for any seller who has completed business-details (so has
 * a geocoded location) but never completed bank-details (the only existing
 * code path that creates a ServiceableZone) — see
 * src/controllers/userController.js sellerBankDetails.
 *
 * IMPORTANT: run and review this BEFORE relying on geo-filtering in
 * production/demo — without it, any such seller's entire catalog silently
 * never appears for any buyer, regardless of distance, because they have
 * no ServiceableZone at all for the $geoNear query to match against.
 *
 * Run manually:  node scripts/backfillServiceableZones.js
 * Does NOT run automatically on server boot. Safe to re-run — only
 * creates zones for sellers that don't already have one (upsert).
 */
import mongoose from 'mongoose';
import 'dotenv/config';
import SellerBusinessDetails from '../src/models/users/sellerBusinessDetails.js';
import ServiceableZone from '../src/models/admin/ServiceableZone.js';
import User from '../src/models/users/user.js';

const FLOOR_RADIUS_METERS = 20000; // 20km, matches GEO_CONFIG.MIN_RADIUS_METERS

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB');

  const businessDetails = await SellerBusinessDetails.find({
    'location.coordinates.0': { $ne: 0 }, // has a real geocoded location, not the [0,0] default
  }).lean();
  console.log(`Found ${businessDetails.length} sellers with business details + a real location`);

  let created = 0;
  let skipped = 0;

  for (const biz of businessDetails) {
    const existing = await ServiceableZone.findOne({ seller_id: biz.seller_id }).lean();
    if (existing) {
      skipped++;
      continue;
    }

    const user = await User.findById(biz.seller_id).lean();
    await ServiceableZone.create({
      seller_id: biz.seller_id,
      seller_info: {
        name: user?.name,
        business_address: biz.business_address,
        pincode: biz.pincode,
      },
      location: {
        type: 'Point',
        coordinates: biz.location.coordinates,
      },
      radius: FLOOR_RADIUS_METERS,
      is_active: true,
      status: 'active',
    });
    created++;
    console.log(`  created zone for seller ${biz.seller_id} (${user?.name || 'unknown'})`);
  }

  console.log(`Done. Created ${created} new ServiceableZone docs, skipped ${skipped} sellers who already had one.`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
