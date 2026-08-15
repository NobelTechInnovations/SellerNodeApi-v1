/**
 * backfillSnapzoSku.js
 * ─────────────────────────────────────────────────────────────────
 * One-time migration: assigns a `snapzo_sku` (SNPZ-XXXXXXXX) to
 * every ProductSellerSKU document that doesn't have one yet.
 *
 * Safe to re-run — it skips docs that already have a snapzo_sku.
 *
 * Usage:
 *   node scripts/backfillSnapzoSku.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import ProductSellerSKU from '../src/models/products/productSellerSku.js';
import connectDB from '../src/config/db.js';

async function run() {
    await connectDB();

    const docs = await ProductSellerSKU.find({ snapzo_sku: { $exists: false } });
    console.log(`Found ${docs.length} docs without snapzo_sku — backfilling…`);

    let updated = 0;
    let failed = 0;

    for (const doc of docs) {
        try {
            // The pre-save hook auto-generates a unique snapzo_sku
            await doc.save();
            updated++;
            if (updated % 50 === 0) {
                console.log(`  ${updated}/${docs.length} updated…`);
            }
        } catch (err) {
            console.error(`  Failed for doc ${doc._id}:`, err.message);
            failed++;
        }
    }

    console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
    process.exit(0);
}

run().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
