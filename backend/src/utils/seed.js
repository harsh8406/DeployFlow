/**
 * Seeds a demo user so the project can be tried immediately after setup
 * without going through the registration form first.
 * Run with: node src/utils/seed.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

const DEMO_EMAIL = "demo@company.com";
const DEMO_PASSWORD = "Demo@1234";

const seed = async () => {
  await connectDB();
  // give the initial connection a moment to establish
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    console.log(`Demo user already exists: ${DEMO_EMAIL}`);
  } else {
    await User.create({
      name: "Demo User",
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      department: "Engineering",
      role: "admin",
    });
    console.log("Demo user created successfully:");
    console.log(`  Email: ${DEMO_EMAIL}`);
    console.log(`  Password: ${DEMO_PASSWORD}`);
  }

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
