const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const GuildSetup = require("../models/GuildSetup");

function cleanName(name) {
  return String(name || "Unbekannt")
    .replace(/[^a-zA-Z0-9-_äöüÄÖÜß]/g, "");
}

module.exports = {

  data: new SlashCommandBuilder()

    .setName("strafe-nachtragen")

    .setDescription(
      "Erstellt eine offene Straf-Nachzahlung"
    )

    .addStringOption(option =>
      option
        .setName("robloxusername")
        .setDescription("Roblox Username")
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName("strafe")
        .setDescription("Strafe")
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName("beschreibung")
        .setDescription("Beschreibung")
        .setRequired(true)
    ),

  async execute(interaction) {

    const setup =
      await GuildSetup.collection.findOne({

        guildId:
          interaction.guild.id
      });

    const strafeSetup =
      setup?.strafeNachtragen;

    if (!strafeSetup) {

      return interaction.reply({

        content:
          "❌ Strafe-Nachtragen-System wurde nicht eingerichtet.",

        ephemeral: true
      });
    }

    const isAllowed =

      interaction.member.permissions.has(
        PermissionFlagsBits.Administrator
      )

      ||

      interaction.member.roles.cache.has(
        strafeSetup.teamRoleId
      );

    if (!isAllowed) {

      return interaction.reply({

        content:
          "❌ Du hast keine Rechte dafür.",

        ephemeral: true
      });
    }

    const robloxUsername =
      interaction.options
        .getString("robloxusername")
        .trim();

    const strafe =
      interaction.options
        .getString("strafe");

    const beschreibung =
      interaction.options
        .getString("beschreibung");

    const timestamp =
      Math.floor(Date.now() / 1000);

    const forum =
      await interaction.guild.channels.fetch(
        strafeSetup.forumChannelId
      );

    const uniqueId =
      Date.now();

    const embed =
      new EmbedBuilder()

        .setTitle(
          "💸 Offene Strafe / Nachzahlung"
        )

        .setColor("Orange")

        .addFields(

          {
            name:
              "Roblox Username",

            value:
              robloxUsername,

            inline: true
          },

          {
            name:
              "Strafe",

            value:
              strafe,

            inline: true
          },

          {
            name:
              "Eingetragen von",

            value:
              `${interaction.user}`,

            inline: true
          },

          {
            name:
              "Zeitpunkt",

            value:
              `<t:${timestamp}:F>`,

            inline: false
          },

          {
            name:
              "Beschreibung",

            value:
              beschreibung,

            inline: false
          },

          {
            name:
              "Status",

            value:
              "❌ Noch nicht nachbezahlt",

            inline: false
          }
        )

        .setFooter({
          text:
            "Strafe-Nachtragen-System"
        })

        .setTimestamp();

    const thread =
      await forum.threads.create({

        name:
          `Strafe-${cleanName(robloxUsername)}`,

        message: {

          content:
            `<@&${strafeSetup.pingRoleId}>`,

          embeds: [embed],

          components: [

            new ActionRowBuilder()

              .addComponents(

                new ButtonBuilder()

                  .setCustomId(
                    `strafe_paid_${uniqueId}`
                  )

                  .setLabel(
                    "Strafe-Nachbezahlt"
                  )

                  .setStyle(
                    ButtonStyle.Success
                  ),

                new ButtonBuilder()

                  .setCustomId(
                    `strafe_delete_${uniqueId}`
                  )

                  .setLabel(
                    "Nachtrag Löschen"
                  )

                  .setStyle(
                    ButtonStyle.Danger
                  )
              )
          ]
        }
      });

    await GuildSetup.collection.updateOne(

      {
        guildId:
          interaction.guild.id
      },

      {
        $set: {

          [`strafeNachtragen.offene.${thread.id}`]: {

            threadId:
              thread.id,

            robloxUsername,

            strafe,

            beschreibung,

            createdBy:
              interaction.user.id,

            createdAt:
              timestamp
          }
        }
      }
    );

    return interaction.reply({

      content:
        `✅ Nachzahlung wurde erstellt: ${thread}`,

      ephemeral: true
    });
  }
};