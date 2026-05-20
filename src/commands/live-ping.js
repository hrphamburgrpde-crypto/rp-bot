const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("live-ping")
    .setDescription("Zeigt einen Live Bot Status an"),

  async execute(interaction) {

    await interaction.deferReply();

    const client = interaction.client;

    const createEmbed = () => {

      const totalSeconds = Math.floor(process.uptime());

      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const uptime =
        `${days}T ${hours}H ${minutes}M ${seconds}S`;

      const ping = client.ws.ping;

      const guilds = client.guilds.cache.size;

      const users = client.guilds.cache.reduce(
        (acc, guild) => acc + guild.memberCount,
        0
      );

      const ram =
        (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

      return new EmbedBuilder()

        .setColor("#00ff88")

        .setTitle("🚀 LIVE BOT STATUS")

        .setDescription(
          [
            "```ansi",
            "\u001b[1;32m🟢 SYSTEM ONLINE\u001b[0m",
            "```"
          ].join("\n")
        )

        .setThumbnail(client.user.displayAvatarURL())

        .addFields(

          {
            name: "📶 Ping",
            value:
              `>>> \`${ping}ms\``,
            inline: true
          },

          {
            name: "🕒 Uptime",
            value:
              `>>> \`${uptime}\``,
            inline: true
          },

          {
            name: "💾 RAM",
            value:
              `>>> \`${ram} MB\``,
            inline: true
          },

          {
            name: "🏠 Server",
            value:
              `>>> \`${guilds}\``,
            inline: true
          },

          {
            name: "👥 Benutzer",
            value:
              `>>> \`${users}\``,
            inline: true
          },

          {
            name: "⚡ Node.js",
            value:
              `>>> \`${process.version}\``,
            inline: true
          },

          {
            name: "🌐 Plattform",
            value:
              `>>> \`${process.platform}\``,
            inline: true
          },

          {
            name: "🤖 Bot",
            value:
              `>>> \`${client.user.tag}\``,
            inline: true
          },

          {
            name: "🔄 Live Update",
            value:
              ">>> `Alle 5 Sekunden`",
            inline: true
          }
        )

        .setImage(
          "https://i.imgur.com/AfFp7pu.png"
        )

        .setFooter({
          text:
            "Roleplay-System • Live Monitoring"
        })

        .setTimestamp();
    };

    const message = await interaction.editReply({
      embeds: [createEmbed()]
    });

    const interval = setInterval(async () => {

      if (!message.editable) {
        clearInterval(interval);
        return;
      }

      await message.edit({
        embeds: [createEmbed()]
      }).catch(() => {
        clearInterval(interval);
      });

    }, 5000);
  }
};