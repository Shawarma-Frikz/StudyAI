require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");
  const adminEmail = process.env.ADMIN_EMAIL || "admin@studyai.tn";
  const adminPass = process.env.ADMIN_PASSWORD || "shawarma";
  const adminName = process.env.ADMIN_NAME || "Admin";
  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    existing.password = adminPass;
    existing.role = "admin";
    existing.isVerified = true;
    existing.isActive = true;
    existing.fullName = adminName;
    await existing.save();
    console.log(`Admin updated: ${adminEmail}`);
  } else {
    await User.create({
      fullName: adminName,
      email: adminEmail,
      password: adminPass,
      role: "admin",
      isVerified: true,
      studyField: "other",
      studyFieldLabel: "Admin",
      memberSince: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
    });
    console.log(`Admin created: ${adminEmail}`);
  }
  await mongoose.disconnect();
  console.log("Done");
}
seed().catch((err) => { console.error(err); process.exit(1); });
