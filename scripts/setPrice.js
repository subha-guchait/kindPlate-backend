// seedServices.js
const mongoose = require("mongoose");
const Service = require("../models/serviceModel"); // adjust the path to your Service model
require("dotenv").config();

async function seedServices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Define services to insert
    const services = [
      {
        name: "ads",
        type: "time_based",
        price: 49, // set your price
        duration: 1, // 1 days for example
      },
      {
        name: "premium",
        type: "one_time",
        price: 999, // set your price
      },
    ];

    for (const service of services) {
      const exists = await Service.findOne({ name: service.name });
      if (!exists) {
        await Service.create(service);
        console.log(`✅ Added service: ${service.name}`);
      } else {
        console.log(`ℹ️ Service '${service.name}' already exists, skipping...`);
      }
    }

    console.log("🎉 Seeding completed!");
    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error seeding services:", error);
    mongoose.connection.close();
  }
}

seedServices();
