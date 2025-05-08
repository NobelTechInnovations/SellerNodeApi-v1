// adminSeeder.js
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const Admin = require('./src/models/admin/Admin'); // adjust path as needed
const bcrypt = require('bcrypt');

// MongoDB connection URI
const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const existingAdmin = await Admin.findOne({ email: 'admin@example.com' });
        if (existingAdmin) {
            console.log('Admin already exists');
            return;
        }

        const hashedPassword = await bcrypt.hash('Admin1234', 10);

        const admin = new Admin({
            name: 'Default Admin',
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'admin'
        });

        await admin.save();
        console.log('Default admin user created');
    } catch (error) {
        console.error('Error seeding admin:', error);
    } finally {
        mongoose.connection.close();
    }
};

seedAdmin();
