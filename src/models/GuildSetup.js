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
ki: {
  type: Object,
  default: null
},

  akte: {
    type: Object,
    default: null
  },
akteEintraege: {
  type: Object,
  default: {}
},

  duty: {
    type: Object,
    default: null
  },
strafeNachtragen: {
  type: Object,
  default: null
}
});

module.exports =
  mongoose.models.GuildSetup ||
  mongoose.model("GuildSetup", guildSetupSchema);
