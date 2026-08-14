/**
 * One-off, manual backfill for OrderProduct.order_id on orders placed
 * BEFORE this field existed on the schema.
 *
 * Best-effort only: it can only recover the FIRST line item per pre-existing
 * order, via the old (deprecated) Order.orderProduct single-ref pointer —
 * any additional line items of a pre-existing multi-item order have no
 * reliable trace of which order they belonged to and remain untouched.
 * All orders placed after this deploy get order_id set correctly at
 * creation time (see src/shop/services/orderService.js) and need no backfill.
 *
 * Run manually:  node scripts/backfillOrderProductOrderId.js
 * Does NOT run automatically on server boot. Safe to re-run — only touches
 * OrderProduct docs that don't already have an order_id.
 */
import mongoose from 'mongoose';
import 'dotenv/config';
import Order from '../src/models/orders/order.js';
import OrderProduct from '../src/models/orders/orderProduct.js';

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB');

  const orders = await Order.find({ orderProduct: { $ne: null } }, { orderProduct: 1 }).lean();
  console.log(`Found ${orders.length} orders with a legacy orderProduct pointer`);

  let updated = 0;
  let skipped = 0;

  for (const order of orders) {
    const result = await OrderProduct.updateOne(
      { _id: order.orderProduct, order_id: { $exists: false } },
      { $set: { order_id: order._id } }
    );
    if (result.modifiedCount > 0) updated++;
    else skipped++;
  }

  console.log(`Backfilled order_id on ${updated} OrderProduct docs (${skipped} already had it or were not found).`);
  console.log('NOTE: this only recovers the first line item per pre-existing order — additional items on');
  console.log('pre-existing multi-item orders remain unlinked (no reliable source data to recover them from).');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
