const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "dutySetups.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-duty")
    .setDescription("Erstellt ein Dienst-System")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator |
      PermissionFlagsBits.KickMembers |
      PermissionFlagsBits.BanMembers
    )

    .addChannelOption(option =>
      option
        .setName("kanal")
        .setDescription("Kanal für das Dienst-Panel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )

    .addRoleOption(option =>
      option
        .setName("on_dutyrolle")
        .setDescription("Rolle, die beim Einchecken gegeben wird")
        .setRequired(true)
    )

    .addChannelOption(option =>
      option
        .setName("logkanal")
        .setDescription("Kanal für Dienst-Logs")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )

    .addRoleOption(option =>
      option
        .setName("off_dutyrolle")
        .setDescription("Rolle, die beim Auschecken gegeben wird")
        .setRequired(false)
    ),

  async execute(interaction) {
    const kanal = interaction.options.getChannel("kanal");
    const onDutyRole = interaction.options.getRole("on_dutyrolle");
    const offDutyRole = interaction.options.getRole("off_dutyrolle");
    const logKanal = interaction.options.getChannel("logkanal");

    const embed = new EmbedBuilder()
      .setTitle("🟢 Dienst-System")
      .setDescription("Aktuell eingecheckte Personen:\n\nKeine Personen im Dienst.")
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("duty_checkin")
        .setLabel("Einchecken")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("duty_checkout")
        .setLabel("Auschecken")
        .setStyle(ButtonStyle.Danger)
    );

    const message = await kanal.send({
      embeds: [embed],
      components: [row]
    });

    let db = {};
    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    }

    db[interaction.guild.id] = {
      channelId: kanal.id,
      messageId: message.id,
      onDutyRoleId: onDutyRole.id,
      offDutyRoleId: offDutyRole ? offDutyRole.id : null,
      logChannelId: logKanal.id,
      activeUsers: {}
    };

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    return interaction.reply({
      content: "✅ Dienst-System wurde eingerichtet.",
      ephemeral: true
    });
  }
};