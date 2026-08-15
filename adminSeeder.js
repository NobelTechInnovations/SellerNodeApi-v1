/**
 * adminSeeder.js — create the default admin account.
 *
 * Usage:
 *   node adminSeeder.js
 *
 * Credentials created:
 *   Email:    admin@snapzo.in
 *   Password: Admin@2024#
 *   Role:     admin
 *
 * Also upserts the legacy admin@example.com account (original seed) so
 * neither set of credentials breaks existing environments.
 *
 * Safe to re-run — skips email addresses that already exist.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './src/models/admin/Admin.js';

const ADMINS = [
    { name: 'Snapzo Admin',   email: 'admin@snapzo.in',   password: 'Admin@2024#',  role: 'admin' },
    { name: 'Default Admin',  email: 'admin@example.com', password: 'Admin1234',    role: 'admin' },
];

async function seed() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('MONGO_URI not set in .env — aborting');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB\n');

    for (const def of ADMINS) {
        const existing = await Admin.findOne({ email: def.email });
        if (existing) {
            console.log(`✓ Admin already exists: ${def.email}`);
            continue;
        }

        const hashed = await bcrypt.hash(def.password, 12);
        await Admin.create({ name: def.name, email: def.email, password: hashed, role: def.role });
        console.log(`✓ Created admin: ${def.email}  /  password: ${def.password}`);
    }

    console.log('\nSeeding complete.');
    await mongoose.connection.close();
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seeder error:', err);
    process.exit(1);
});
