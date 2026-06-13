require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const TestType = require('./models/TestType');
const LabTest = require('./models/LabTest');
const connectDB = require('./config/db');

async function seed() {
  await connectDB();
  try {
    // Clear existing (CAREFUL in production)
    await User.deleteMany({});
    await TestType.deleteMany({});
    await LabTest.deleteMany({});

    // Create users
    const admin = await User.create({ name: 'Admin User', email: 'admin@lab.com', password: 'password123', role: 'admin' });
    const tech = await User.create({ name: 'Tech User', email: 'tech@lab.com', password: 'password123', role: 'technician' });
    const patient = await User.create({ name: 'Patient User', email: 'patient@lab.com', password: 'password123', role: 'patient' });

    // Create test types
    const blood = await TestType.create({ name: 'Complete Blood Count', description: 'CBC', price: 300 });
    const sugar = await TestType.create({ name: 'Blood Sugar (Fasting)', description: 'Fasting blood sugar', price: 150 });

    // Create sample lab tests
    await LabTest.create({ patient: patient._id, testType: blood._id, notes: 'Routine check' });
    await LabTest.create({ patient: patient._id, testType: sugar._id, notes: 'Pre-diabetes check' });

    console.log('Seeding completed.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
