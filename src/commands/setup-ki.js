const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const GuildSetup =
  require("../models/GuildSetup");

module.exports = {

  data:
    new SlashCommandBuilder()

      .setName("setup-ki")

      .setDescription(
        "Fügt eine KI Strafe hinzu"
      )

      .setDefaultMemberPermissions(
        PermissionFlagsBits.Administrator
      )

      .addStringOption(option =>

        option

          .setName("typ")

          .setDescription(
            "Typ z.b Fahrerflucht"
          )

          .setRequired(true)
      )

      .addStringOption(option =>

        option

          .setName("strafe")

          .setDescription(
            "Strafe z.b 10000€"
          )

          .setRequired(true)
      ),

  async execute(interaction) {

    const typ =
      interaction.options
        .getString("typ");

    const strafe =
      interaction.options
        .getString("strafe");

    await GuildSetup.collection.updateOne(

      {
        guildId:
          interaction.guild.id
      },

      {
        $set: {
          [`ki.strafen.${typ}`]:
            strafe
        }
      },

      {
        upsert: true
      }
    );

    return interaction.reply({

      content:
        `✅ KI Strafe gespeichert.\n` +
        `Typ: ${typ}\n` +
        `Strafe: ${strafe}`,

      ephemeral: true
    });
  }
};