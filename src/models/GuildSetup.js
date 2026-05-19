const mongoose = require("mongoose");

const guildSetupSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },

  verify: {
    type: Object,
    default: null
  },

  notruf: {
    type: Object,
    default: null
  },

  akte: {
    type: Object,
    default: null
  },

  duty: {
    type: Object,
    default: null
  }
});

module.exports = mongoose.model("GuildSetup", guildSetupSchema);