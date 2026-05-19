const mongoose = require("mongoose");

async function connectMongo() {
  try {
    if (!process.env.MONGO_URI) {
      console.log("❌ MONGO_URI fehlt.");
      return;
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB verbunden");
  } catch (err) {
    console.error("❌ MongoDB Fehler:", err.message);
  }
}

module.exports = connectMongo;