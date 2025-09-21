const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config(); // to load MONGO_URI

// Import the User model from models/User.js
const User = require("./models/User");

async function createAdmins() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // 1. Delete the old admin
    const oldEmail = "kmaheshraghava@gmail.com";
    const deleted = await User.deleteOne({ email: oldEmail });
    if (deleted.deletedCount > 0) {
      console.log(`🗑️ Deleted old admin: ${oldEmail}`);
    } else {
      console.log(`⚠️ Old admin not found: ${oldEmail}`);
    }

    // 2. Define new admins
    const admins = [
      { fullname: "Admin User 1", email: "maheshraghava@gmail.com", password: "nothing123" },
      { fullname: "Admin User 2", email: "admin@gmail.com", password: "webcapadmin" },
    ];

    // 3. Add new admins
    for (const admin of admins) {
      const existingAdmin = await User.findOne({ email: admin.email });
      if (existingAdmin) {
        // Optionally update role and isVerified if needed
        let updated = false;
        if (existingAdmin.role !== 'admin' || !existingAdmin.isVerified) {
          existingAdmin.role = 'admin';
          existingAdmin.isVerified = true;
          await existingAdmin.save();
          updated = true;
        }
        console.log(
          `⚠️ Admin already exists: ${admin.email}${updated ? " (role/isVerified updated)" : ""}`
        );
      } else {
        const hashedPassword = await bcrypt.hash(admin.password, 10);

        const newAdmin = new User({
          fullname: admin.fullname,
          email: admin.email,
          password: hashedPassword,
          role: "admin",
          isVerified: true,
        });

        await newAdmin.save();
        console.log(`🎉 Created admin: ${admin.email}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating admins:", err);
    process.exit(1);
  }
}

createAdmins();