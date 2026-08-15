/**
 * Phase 4, M10 — synthetic behavioral data for the Product Intelligence
 * System. Populates UserEvent with realistic, multi-session buyer journeys
 * across the 7 real seeded sellers / ~187 real products / real categories,
 * so every M6 (seller insights) and M7 (admin analytics) view has enough
 * volume to show trends, funnels, and keyword intelligence instead of
 * empty states.
 *
 * IMPORTANT — this seeds ANALYTICS DATA ONLY, not real commerce records.
 * 'purchase' events are inserted directly into UserEvent (with a synthetic
 * order_id) rather than by creating real Order/OrderProduct documents
 * through orderService.placeOrder. That path has real business logic
 * (per-seller order splitting, address/payment validation, computed
 * totals) that a bulk seed script has no business faking — and a fake
 * Order would wrongly show up in a seller's or buyer's real order list.
 * UserEvent rows are exactly what the M6/M7 analytics aggregate over, so
 * this is the correct and sufficient seeding surface for this phase.
 *
 * Buyer identities: reuses whatever real Customers already exist, plus
 * creates a pool of synthetic ones (phone prefix 90000000xx, upserted —
 * safe to re-run). Each identity gets a randomly assigned "confidence
 * tier" (cold/weak/medium/strong) and a matching number of sessions, so
 * behaviorProfileService's tiering has a realistic spread to show, not
 * just a pile of identical cold-start users.
 *
 * Run manually:  node scripts/seedBehaviorData.js
 * Does NOT run automatically on server boot. Safe to re-run: it first
 * deletes its OWN prior output (events whose session_id starts with
 * `seed_sess_`) so repeat runs give a consistent volume instead of
 * compounding. Real user events never carry that prefix and are untouched.
 */
import mongoose from 'mongoose';
import 'dotenv/config';
import Product from '../src/models/products/product.js';
import ProductDescription from '../src/models/products/productDescription.js';
import ProductPrice from '../src/models/products/productPrice.js';
import ProductSellerSku from '../src/models/products/productSellerSku.js';
import Category from '../src/models/products/category.js';
import UserEvent from '../src/models/events/userEvent.js';
import customerDbConnection from '../src/shop/config/database.js';
import { Customer } from '../src/shop/models/index.js';

const SYNTHETIC_CUSTOMER_COUNT = 60;
const SESSION_PREFIX = 'seed_sess_';
const NAME_POOL = [
  'Aarav Shah', 'Ishita Rao', 'Kabir Nair', 'Meera Iyer', 'Rohan Gupta',
  'Ananya Joshi', 'Vivaan Reddy', 'Diya Kapoor', 'Aditya Menon', 'Saanvi Pillai',
  'Arjun Bose', 'Kavya Chatterjee', 'Ishaan Malhotra', 'Riya Sinha', 'Dev Chauhan',
];

const DEVICE_TYPES = ['mobile', 'mobile', 'desktop', 'tablet']; // mobile-weighted
const SOURCES_BROWSE = ['homepage', 'category'];
const NO_RESULT_KEYWORDS = ['bluetooth toaster', 'solar backpack charger', 'led shoelaces', 'wireless kettle'];

const TIER_WEIGHTS = [
  { tier: 'cold', weight: 0.30, sessions: [1, 2] },
  { tier: 'weak', weight: 0.30, sessions: [3, 6] },
  { tier: 'medium', weight: 0.25, sessions: [8, 14] },
  { tier: 'strong', weight: 0.15, sessions: [18, 28] },
];

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const sample = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (copy.length && out.length < n) {
    out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return out;
};
const pickTier = () => {
  const r = Math.random();
  let acc = 0;
  for (const t of TIER_WEIGHTS) {
    acc += t.weight;
    if (r <= acc) return t;
  }
  return TIER_WEIGHTS[0];
};
const keywordFromTitle = (title) => {
  const words = title.replace(/[^\w\s]/g, '').split(/\s+/).filter((w) => w.length > 3);
  return words.length ? pick(words).toLowerCase() : title.toLowerCase();
};

async function waitForCustomerDb() {
  if (customerDbConnection.readyState === 1) return;
  await new Promise((resolve, reject) => {
    customerDbConnection.once('open', resolve);
    customerDbConnection.once('error', reject);
  });
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  await waitForCustomerDb();
  console.log('Connected to both databases.');

  // --- Load real catalog data --------------------------------------------
  const products = await Product.find({ status: 'published' }).select('product_id category_id type').lean();
  const descByProductId = new Map(
    (await ProductDescription.find({ language: 'en' }).select('product_id title').lean())
      .map((d) => [d.product_id, d.title])
  );
  const priceByProductId = new Map(
    (await ProductPrice.find().select('product_id selling_price').lean())
      .map((p) => [p.product_id, p.selling_price ? parseFloat(p.selling_price.toString()) : null])
  );
  const sellerByProductId = new Map(
    (await ProductSellerSku.find().select('product_id seller_id').lean())
      .map((s) => [s.product_id, s.seller_id.toString()])
  );
  const categories = await Category.find().select('name').lean();
  const categoryNameById = new Map(categories.map((c) => [c._id.toString(), c.name]));

  const catalog = products
    .filter((p) => descByProductId.has(p.product_id))
    .map((p) => ({
      product_id: p.product_id,
      category_id: p.category_id,
      title: descByProductId.get(p.product_id) || p.product_id,
      price: priceByProductId.get(p.product_id) || randInt(299, 29999),
      seller_id: sellerByProductId.get(p.product_id) || null,
    }));

  const productsByCategory = new Map();
  for (const p of catalog) {
    const key = p.category_id?.toString();
    if (!key) continue;
    if (!productsByCategory.has(key)) productsByCategory.set(key, []);
    productsByCategory.get(key).push(p);
  }
  const activeCategoryIds = [...productsByCategory.keys()].filter((k) => productsByCategory.get(k).length >= 2);

  console.log(`Catalog loaded: ${catalog.length} products across ${activeCategoryIds.length} categories, ${new Set(catalog.map(p => p.seller_id)).size} sellers.`);

  // --- Ensure buyer identities --------------------------------------------
  const existingCustomers = await Customer.find().select('_id name').lean();

  // bulkWrite instead of a findOneAndUpdate per customer — one round trip
  // rather than SYNTHETIC_CUSTOMER_COUNT of them.
  const syntheticPhones = Array.from({ length: SYNTHETIC_CUSTOMER_COUNT }, (_, i) => `9000${String(i).padStart(6, '0')}`);
  await Customer.bulkWrite(
    syntheticPhones.map((phone, i) => ({
      updateOne: {
        filter: { phone },
        update: { $setOnInsert: { phone, name: NAME_POOL[i % NAME_POOL.length] } },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  const syntheticCustomers = await Customer.find({ phone: { $in: syntheticPhones } }).select('_id').lean();
  console.log(`Buyer identities ready: ${existingCustomers.length} real + ${syntheticCustomers.length} synthetic.`);

  const identities = [...existingCustomers, ...syntheticCustomers].map((c) => ({
    customerId: c._id.toString(),
    anonId: `anon_seed_${c._id.toString()}`,
  }));

  // --- Generate events ------------------------------------------------------
  const events = [];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  for (const identity of identities) {
    const { tier, sessions: sessionRange } = pickTier();
    const numSessions = randInt(sessionRange[0], sessionRange[1]);
    const cartProb = { cold: 0.05, weak: 0.15, medium: 0.35, strong: 0.55 }[tier];
    const purchaseProb = { cold: 0.02, weak: 0.08, medium: 0.2, strong: 0.4 }[tier];
    const deviceType = pick(DEVICE_TYPES);

    // 1-3 favorite categories this identity keeps coming back to — this is
    // exactly the signal behaviorProfileService's categoryAffinity scoring
    // is meant to pick up on.
    const favoriteCategoryIds = sample(activeCategoryIds, randInt(1, Math.min(3, activeCategoryIds.length)));

    for (let s = 0; s < numSessions; s++) {
      const sessionId = `${SESSION_PREFIX}${identity.customerId}_${s}_${Date.now().toString(36)}${randInt(100, 999)}`;
      const daysAgo = tier === 'strong' ? randInt(0, 30) : randInt(0, 60);
      let t = now - daysAgo * DAY - randInt(0, 12) * 60 * 60 * 1000;

      const useSearch = Math.random() < 0.6;
      const categoryId = Math.random() < 0.8 && favoriteCategoryIds.length
        ? pick(favoriteCategoryIds)
        : pick(activeCategoryIds);
      const categoryProducts = productsByCategory.get(categoryId) || [];
      if (categoryProducts.length < 2) continue;

      const impressionCount = Math.min(categoryProducts.length, randInt(4, 8));
      const impressionProducts = sample(categoryProducts, impressionCount);
      const source = useSearch ? 'search' : pick(SOURCES_BROWSE);
      const placement = source === 'homepage' ? 'homepage' : source === 'category' ? 'category' : null;

      const base = {
        customer_id: identity.customerId,
        anon_id: identity.anonId,
        session_id: sessionId,
        device_type: deviceType,
        category_id: new mongoose.Types.ObjectId(categoryId),
      };

      // Occasionally fire a genuinely no-result search — feeds the
      // "no-result keywords" gap report. Standalone, short session.
      if (useSearch && Math.random() < 0.08) {
        events.push({
          ...base, event_type: 'search', search_query: pick(NO_RESULT_KEYWORDS),
          product_ids: [], positions: [], source: 'search', created_at: new Date(t),
        });
        continue;
      }

      let searchKeyword = null;
      if (useSearch) {
        searchKeyword = keywordFromTitle(pick(impressionProducts).title);
        events.push({
          ...base, event_type: 'search', search_query: searchKeyword,
          product_ids: impressionProducts.map((p) => p.product_id),
          positions: impressionProducts.map((_, i) => i + 1),
          source: 'search', created_at: new Date(t),
        });
      } else {
        events.push({
          ...base, event_type: 'product_impression',
          product_ids: impressionProducts.map((p) => p.product_id),
          positions: impressionProducts.map((_, i) => i + 1),
          source, placement, based_on: 'trending', created_at: new Date(t),
        });
      }
      t += randInt(5, 20) * 1000;

      // Click one of the impressed products — weighted toward the top
      // positions, matching real CTR-by-position patterns.
      const clickIndex = Math.min(impressionProducts.length - 1, Math.floor(Math.abs(rand(0, 2)) * impressionProducts.length / 2));
      const clicked = impressionProducts[clickIndex];
      events.push({
        ...base, event_type: 'product_click',
        product_id: clicked.product_id, position: clickIndex + 1,
        // seller_id: the live API resolves this server-side from product_id
        // (eventService.trackEvent) for every event carrying one. This
        // script writes to the collection directly, so it has to mirror that
        // enrichment itself — without it, seller-scoped click/CTR queries
        // (organic reach, keyword CTR) see zero clicks for seeded data.
        seller_id: clicked.seller_id,
        // search_query on a search-sourced click: what the real search
        // results page sends (see SearchResultsClient.js), and what the
        // keyword-CTR join in sellerInsightsService matches on.
        search_query: source === 'search' ? searchKeyword : null,
        source, placement, created_at: new Date(t),
      });
      t += randInt(2, 8) * 1000;

      events.push({
        ...base, event_type: 'view_product', product_id: clicked.product_id,
        seller_id: clicked.seller_id, source, created_at: new Date(t),
      });
      t += randInt(3, 10) * 1000;

      if (Math.random() < 0.45) {
        events.push({ ...base, event_type: 'product_scroll', product_id: clicked.product_id, seller_id: clicked.seller_id, source: 'pdp', created_at: new Date(t) });
        t += randInt(5, 20) * 1000;
        events.push({ ...base, event_type: 'product_content_read', product_id: clicked.product_id, seller_id: clicked.seller_id, source: 'pdp', created_at: new Date(t) });
        t += randInt(5, 20) * 1000;
      }

      // PDP recommendation rail exposure — separate placement from the
      // original discovery source, models a real "similar products" rail.
      if (Math.random() < 0.3 && categoryProducts.length > 1) {
        const rail = sample(categoryProducts.filter((p) => p.product_id !== clicked.product_id), Math.min(3, categoryProducts.length - 1));
        if (rail.length) {
          events.push({
            ...base, event_type: 'recommendation_impression',
            product_ids: rail.map((p) => p.product_id), positions: rail.map((_, i) => i + 1),
            placement: 'pdp_similar', based_on: 'category_affinity', source: 'pdp', created_at: new Date(t),
          });
          if (Math.random() < 0.35) {
            const rc = pick(rail);
            t += randInt(2, 6) * 1000;
            events.push({
              ...base, event_type: 'recommendation_click', product_id: rc.product_id, seller_id: rc.seller_id,
              placement: 'pdp_similar', based_on: 'category_affinity', source: 'pdp', created_at: new Date(t),
            });
          }
        }
      }

      if (Math.random() < 0.06) {
        events.push({ ...base, event_type: 'wishlist', product_id: clicked.product_id, seller_id: clicked.seller_id, source: 'pdp', created_at: new Date(t) });
      }

      if (Math.random() < cartProb) {
        t += randInt(10, 30) * 1000;
        const qty = randInt(1, 2);
        events.push({
          ...base, event_type: 'add_to_cart', product_id: clicked.product_id, seller_id: clicked.seller_id,
          price: clicked.price, quantity: qty, value: clicked.price * qty, source: 'pdp', created_at: new Date(t),
        });

        if (Math.random() < purchaseProb) {
          t += randInt(60, 600) * 1000;
          events.push({ ...base, event_type: 'checkout_started', source: 'checkout', created_at: new Date(t) });
          t += randInt(30, 180) * 1000;
          events.push({
            ...base, event_type: 'purchase', product_id: clicked.product_id, seller_id: clicked.seller_id,
            price: clicked.price, quantity: qty, value: clicked.price * qty,
            order_id: `SEED-${sessionId}`, source: 'checkout', created_at: new Date(t),
          });
        } else if (Math.random() < 0.2) {
          t += randInt(30, 120) * 1000;
          events.push({ ...base, event_type: 'remove_from_cart', product_id: clicked.product_id, seller_id: clicked.seller_id, source: 'cart', created_at: new Date(t) });
        }
      }
    }
  }

  // Clear this script's own prior output so re-runs stay at a consistent
  // volume. Scoped strictly to the seed session prefix — real tracked
  // events (no session_id, or a real sessionStorage-generated one) never
  // match, so genuine user behavior data is never touched.
  const cleared = await UserEvent.deleteMany({ session_id: { $regex: `^${SESSION_PREFIX}` } });
  console.log(`Cleared ${cleared.deletedCount} events from previous seed runs.`);

  console.log(`Generated ${events.length} synthetic events. Inserting...`);
  // Native collection.insertMany (bypasses Mongoose's timestamps plugin,
  // which would otherwise overwrite our deliberately backdated created_at)
  // — chunked to keep a single insert well under MongoDB's batch limits.
  const CHUNK = 1000;
  for (let i = 0; i < events.length; i += CHUNK) {
    await UserEvent.collection.insertMany(events.slice(i, i + CHUNK), { ordered: false });
    console.log(`  inserted ${Math.min(i + CHUNK, events.length)}/${events.length}`);
  }

  // Summary so a run is self-verifying without a separate query.
  const byType = await UserEvent.aggregate([
    { $match: { session_id: { $regex: `^${SESSION_PREFIX}` } } },
    { $group: { _id: '$event_type', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
  console.log('Seeded events by type:');
  byType.forEach((r) => console.log(`  ${r._id.padEnd(28)} ${r.n}`));

  const distinctProducts = await UserEvent.distinct('product_id', {
    session_id: { $regex: `^${SESSION_PREFIX}` }, product_id: { $ne: null },
  });
  const distinctSellers = await UserEvent.distinct('seller_id', {
    session_id: { $regex: `^${SESSION_PREFIX}` }, seller_id: { $ne: null },
  });
  console.log(`Coverage: ${distinctProducts.length} distinct products, ${distinctSellers.length} distinct sellers.`);

  console.log('Done.');
  await mongoose.disconnect();
  await customerDbConnection.close();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
