const {
  EmbedBuilder
} = require("discord.js");

const GuildSetup =
  require("../models/GuildSetup");

module.exports = {

  name: "messageCreate",

  async execute(message) {

    try {

      if (message.author.bot) return;

      if (
        !message.mentions.users.has(
          message.client.user.id
        )
      ) return;

      const content =
        message.content.toLowerCase();

      const setup =
        await GuildSetup.collection.findOne({

          guildId:
            message.guild.id
        });

      // STRAFEN

      if (
        content.includes("strafe")
        ||

        content.includes("fahrerflucht")
        ||

        content.includes("rotlicht")
      ) {

        const strafen =
          setup?.ki?.strafen || {};

        let found = null;

        for (const [typ, betrag] of Object.entries(strafen)) {

          if (
            content.includes(
              typ.toLowerCase()
            )
          ) {

            found = {
              typ,
              betrag
            };

            break;
          }
        }

        if (found) {

          const embed =
            new EmbedBuilder()

              .setTitle(
                "🤖 KI Strafvorschlag"
              )

              .setColor("Orange")

              .addFields(

                {
                  name:
                    "Verstoß",

                  value:
                    found.typ,

                  inline: true
                },

                {
                  name:
                    "Empfohlene Strafe",

                  value:
                    found.betrag,

                  inline: true
                }
              )

              .setFooter({
                text:
                  "KI Behörden Assistent"
              })

              .setTimestamp();

          return message.reply({
            embeds: [embed]
          });
        }
      }

      // AKTEN CHECK

      if (
        content.includes("akte")
        ||

        content.includes("akten")
      ) {

        const words =
          message.content.split(" ");

        let robloxUsername =
          words[words.length - 1];

        robloxUsername =
          robloxUsername
            .replace("@", "")
            .trim();

        const akten =
          setup?.akte?.akten || {};

        const matches =
          Object.keys(akten)

            .filter(key =>

              key.includes(
                robloxUsername.toLowerCase()
              )
            );

        const embed =
          new EmbedBuilder()

            .setTitle(
              "📁 KI Aktenprüfung"
            )

            .setColor("Blue")

            .addFields(

              {
                name:
                  "User",

                value:
                  robloxUsername,

                inline: true
              },

              {
                name:
                  "Offene Akten",

                value:
                  String(matches.length),

                inline: true
              }
            )

            .setFooter({
              text:
                "KI Behörden Assistent"
            })

            .setTimestamp();

        return message.reply({
          embeds: [embed]
        });
      }

      // STANDARD

      return message.reply({

        content:
          "🤖 KI konnte dazu nichts finden."
      });

    } catch (err) {

      console.error(
        "KI CHAT ERROR:",
        err
      );
    }
  }
};