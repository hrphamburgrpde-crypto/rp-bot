const mongoose = require("mongoose");

const guildSetupSchema = new mongoose.Schema(
  {
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
    },

    status: {
      type: Object,
      default: null
    }
  },
  {
    strict: false
  }
);

module.exports =
  mongoose.models.GuildSetup ||
  mongoose.model("GuildSetup", guildSetupSchema);