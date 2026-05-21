const {
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const GuildSetup =
  require("../models/GuildSetup");

function cleanName(name) {

  return String(name || "Unbekannt")

    .replace(
      /[^a-zA-Z0-9-_äöüÄÖÜß]/g,
      ""
    );
}

async function getOrCreateAkteThread(
  interaction,
  setup,
  robloxUsername
) {

  if (!setup.akte) return null;

  if (!setup.akte.akten) {
    setup.akte.akten = {};
  }

  const safeRoblox =
    String(
      robloxUsername || "Unbekannt"
    ).trim();

  const akteKey =
    `roblox_${safeRoblox.toLowerCase()}`;

  const savedThreadId =
    setup.akte.akten[akteKey];

  if (savedThreadId) {

    const oldThread =
      await interaction.guild.channels
        .fetch(savedThreadId)
        .catch(() => null);

    if (oldThread) return oldThread;
  }

  const forum =
    await interaction.guild.channels
      .fetch(setup.akte.forumChannelId)
      .catch(() => null);

  if (!forum) return null;

  const thread =
    await forum.threads.create({

      name:
        `Akte-${cleanName(safeRoblox)}`,

      message: {

        embeds: [

          new EmbedBuilder()

            .setTitle(
              `📁 Akte von ${safeRoblox}`
            )

            .setDescription(
              `Gemeinsame Akte für Roblox-User **${safeRoblox}**.`
            )

            .setColor("Blue")
        ]
      }
    });

  setup.akte.akten[akteKey] =
    thread.id;

  await GuildSetup.collection.updateOne(

    {
      guildId:
        interaction.guild.id
    },

    {
      $set: {
        [`akte.akten.${akteKey}`]:
          thread.id
      }
    }
  );

  return thread;
}

module.exports = {

  name: "interactionCreate",

  async execute(interaction) {

    try {

      if (!interaction.isButton()) return;

      if (

        !interaction.customId.startsWith(
          "strafe_paid_"
        )

        &&

        !interaction.customId.startsWith(
          "strafe_delete_"
        )

      ) return;

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

      const threadId =
        interaction.channel.id;

      const data =
        strafeSetup.offene?.[threadId];

      if (!data) {

        return interaction.reply({

          content:
            "❌ Nachtrag nicht gefunden.",

          ephemeral: true
        });
      }

      // DELETE BUTTON

      if (
        interaction.customId.startsWith(
          "strafe_delete_"
        )
      ) {

        await GuildSetup.collection.updateOne(

          {
            guildId:
              interaction.guild.id
          },

          {
            $unset: {
              [`strafeNachtragen.offene.${threadId}`]:
                ""
            }
          }
        );

        await interaction.reply({

          content:
            "✅ Nachtrag wurde gelöscht.",

          ephemeral: true
        });

        return interaction.channel
          .delete()
          .catch(() => {});
      }

      // PAID BUTTON

      await interaction.deferReply({
        ephemeral: true
      });

      const akteThread =
        await getOrCreateAkteThread(

          interaction,
          setup,
          data.robloxUsername
        );

      if (akteThread) {

        const timestamp =
          Math.floor(Date.now() / 1000);

        const embed =
          new EmbedBuilder()

            .setTitle(
              "✅ Strafe nachbezahlt"
            )

            .setColor("Green")

            .addFields(

              {
                name:
                  "Roblox Username",

                value:
                  data.robloxUsername,

                inline: true
              },

              {
                name:
                  "Strafe",

                value:
                  data.strafe,

                inline: true
              },

              {
                name:
                  "Nachbezahlt bestätigt von",

                value:
                  `${interaction.user}`,

                inline: true
              },

              {
                name:
                  "Beschreibung",

                value:
                  data.beschreibung,

                inline: false
              }
            )

            .setFooter({
              text:
                "Strafe-Nachtragen-System"
            })

            .setTimestamp();

        await akteThread.send({
          embeds: [embed]
        });
      }

      await GuildSetup.collection.updateOne(

        {
          guildId:
            interaction.guild.id
        },

        {
          $unset: {
            [`strafeNachtragen.offene.${threadId}`]:
              ""
          }
        }
      );

      await interaction.editReply({

        content:
          "✅ Strafe wurde als bezahlt markiert."
      });

      return interaction.channel
        .delete()
        .catch(() => {});

    } catch (err) {

      console.error(
        "STRAFE NACHTRAGEN ERROR:",
        err
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {

        return interaction.reply({

          content:
            "❌ Fehler beim Verarbeiten.",

          ephemeral: true

        }).catch(() => {});
      }
    }
  }
};