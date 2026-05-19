const mongoose = require("mongoose");

async function connectMongo() {
  if (!process.env.MONGO_URI) {
    console.log("❌ MONGO_URI fehlt in .env / Railway Variables");
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);

  console.log("✅ MongoDB verbunden");
}

module.exports = connectMongo;