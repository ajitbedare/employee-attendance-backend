const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Employee = require("./models/employee");
require("dotenv").config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingAdmin = await Employee.findOne({
      role: "admin",
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("Admin123", 10);

    const admin = new Employee({
      employeeId: "admin01",
      name: "Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();

    console.log("Admin created successfully");
  } catch (error) {
    console.log(error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();