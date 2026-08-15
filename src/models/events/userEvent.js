import mongoose from 'mongoose';

const { Schema } = mongoose;

// Lightweight behavior-tracking event — powers "recently viewed"/recommendation
// style personalization (see shop/services/homeFeedService.js). Deliberately
// minimal: no Kafka/Elasticsearch available in this environment (see Phase 1
// notes), so this is a plain Mongo collection written directly on each
// tracked action. The shape is intentionally flat and generic so a future
// swap to a real event pipeline (Kafka topic -> ES index) only needs to
// change how these get written/read, not the event shape itself.
const userEventSchema = new Schema({
  // Plain strings, not ObjectId refs — customer_id may come from either the
  // shop's Customer model (different mongoose connection/bson install, see
  // the BSONVersionError note in orderService.js) or be entirely absent for
  // guest browsing (anon_id only). Keeping both as strings sidesteps that
  // cross-connection hazard and keeps guest/logged-in tracking uniform.
  customer_id: { type: String, default: null, index: true },
  anon_id: { type: String, default: null, index: true },

  event_type: {
    type: String,
    // 'purchase' added for Phase 3 (ads-readiness) — fired server-side by
    // orderService.placeOrder on every successful per-seller order, not by
    // the frontend, so it's never lost to a closed tab/network blip the
    // way a client-fired conversion event would be.
    //
    // Phase 4 additions (product intelligence system):
    //  - product_impression / recommendation_impression: BATCH events (one
    //    row per render, product_ids+positions arrays below) — not one row
    //    per shown product, to keep write volume sane on grid/rail renders.
    //  - product_click / recommendation_click: a single product being
    //    clicked out of an impression batch, carries `position`.
    //  - product_scroll / product_content_read / product_image_view:
    //    engagement depth signals on the PDP.
    //  - remove_from_cart / wishlist / checkout_started: funnel completeness.
    enum: [
      'view_product', 'view_category', 'search', 'add_to_cart', 'purchase',
      'product_impression', 'product_click', 'product_scroll', 'product_content_read', 'product_image_view',
      'remove_from_cart', 'wishlist', 'checkout_started',
      'recommendation_impression', 'recommendation_click',
    ],
    required: true,
    index: true,
  },

  product_id: { type: String, default: null }, // Product.product_id business key
  category_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  search_query: { type: String, default: null },

  // --- Phase 3 additions: ads/attribution-ready fields. All optional and
  // additive so nothing existing breaks; older documents simply have these
  // as null. Plain strings (not ObjectId refs) for the same cross-connection
  // /cross-bson-version reason customer_id already is (see note above).
  seller_id: { type: String, default: null, index: true },
  order_id: { type: String, default: null },

  // Monetary snapshot at the time of the event — a product's price can
  // change later, so ad spend/ROAS analysis needs the value as it was
  // when the event happened, not today's price.
  price: { type: Number, default: null },       // unit price
  quantity: { type: Number, default: null },
  value: { type: Number, default: null },        // total monetary value of this event (e.g. order total for 'purchase')
  currency: { type: String, default: 'INR' },

  device_type: { type: String, default: null },  // 'mobile' | 'desktop' | 'tablet', best-effort from the client
  referrer: { type: String, default: null },      // document.referrer or an explicit campaign/source tag

  // --- Phase 4 additions: context + batch-impression + recommendation fields.
  // A per-tab/visit id (sessionStorage-backed, distinct from the persistent
  // anon_id) — lets co-view/session-journey queries group events without
  // conflating a user's whole multi-day history into one "session".
  session_id: { type: String, default: null, index: true },

  // Where on the site the event happened — feeds "organic reach by
  // placement" (search vs homepage vs category vs recommendation vs related).
  source: { type: String, default: null, index: true }, // homepage|category|search|pdp|cart|checkout

  // Ranking position within the list the user interacted with (1-based) —
  // required for accurate CTR-by-position and search-ranking analysis.
  position: { type: Number, default: null },

  // Which recommendation rail this impression/click belongs to.
  placement: { type: String, default: null }, // homepage|category|pdp_similar|pdp_fbt|cart|search

  // Batch impression payload: every product shown in one render, with a
  // parallel positions array. Used by product_impression/recommendation_impression
  // instead of one document per shown product.
  product_ids: { type: [String], default: undefined },
  positions: { type: [Number], default: undefined },

  // Why a recommendation was made — lets the seller/admin analytics explain
  // *why* a product was surfaced, not just that it was.
  based_on: { type: String, default: null }, // category_affinity|co_view|co_purchase|trending|default

}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// Most reads filter by "this identity's events, most recent first" —
// covers both the logged-in and guest cases.
userEventSchema.index({ customer_id: 1, created_at: -1 });
userEventSchema.index({ anon_id: 1, created_at: -1 });

// Ads-console-shaped access patterns: "this seller's events in a date
// range" and "this product's funnel" are the two aggregation queries
// getSellerAnalytics/getProductAnalytics run.
userEventSchema.index({ seller_id: 1, event_type: 1, created_at: -1 });
userEventSchema.index({ product_id: 1, event_type: 1, created_at: -1 });

// Phase 4: "organic reach by placement" and "co-view within a session" query patterns.
userEventSchema.index({ source: 1, created_at: -1 });
userEventSchema.index({ event_type: 1, source: 1, created_at: -1 });
userEventSchema.index({ session_id: 1, event_type: 1 });

export default mongoose.model('UserEvent', userEventSchema);
