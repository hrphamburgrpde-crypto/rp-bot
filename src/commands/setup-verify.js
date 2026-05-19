const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const GuildSetup = require("../models/GuildSetup");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-verify")
    .setDescription("Erstellt ein Verify-System")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator |
      PermissionFlagsBits.KickMembers |
      PermissionFlagsBits.BanMembers
    )
    .addChannelOption(option =>
      option
        .setName("kanal")
        .setDescription("Kanal für das Verify-Panel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("rolle_adden")
        .setDescription("Rolle, die nach Verify gegeben wird")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("captcha")
        .setDescription("Captcha aktivieren?")
        .addChoices(
          { name: "An", value: "an" },
          { name: "Aus", value: "aus" }
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("roblox_username")
        .setDescription("Roblox Username abfragen?")
        .addChoices(
          { name: "An", value: "an" },
          { name: "Aus", value: "aus" }
        )
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("rolle_entfernen")
        .setDescription("Rolle, die nach Verify entfernt wird")
        .setRequired(false)
    ),

  async execute(interaction) {
    const kanal = interaction.options.getChannel("kanal");
    const rolleAdden = interaction.options.getRole("rolle_adden");
    const rolleEntfernen = interaction.options.getRole("rolle_entfernen");
    const captcha = interaction.options.getString("captcha");
    const robloxUsername = interaction.options.getString("roblox_username");

    const embed = new EmbedBuilder()
      .setTitle("✅ Verifizierung")
      .setDescription("Klicke auf den Button, um dich zu verifizieren.")
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify_start")
        .setLabel("Verifizieren")
        .setStyle(ButtonStyle.Success)
    );

    const message = await kanal.send({
      embeds: [embed],
      components: [row]
    });

    await GuildSetup.findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        $set: {
          guildId: interaction.guild.id,
          verify: {
            channelId: kanal.id,
            messageId: message.id,
            roleAddId: rolleAdden.id,
            roleRemoveId: rolleEntfernen ? rolleEntfernen.id : null,
            captchaEnabled: captcha === "an",
            robloxUsernameEnabled: robloxUsername === "an"
          }
        }
      },
      { upsert: true }
    );

    return interaction.reply({
      content: "✅ Verify-System wurde gespeichert.",
      ephemeral: true
    });
  }
};