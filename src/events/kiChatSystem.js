const {
  EmbedBuilder
} = require("discord.js");

const GuildSetup = require("../models/GuildSetup");

function cleanUsername(text) {
  return String(text || "")
    .replace(/<@!?\d+>/g, "")
    .replace(/[?:,]/g, "")
    .trim();
}

function getRiskLevel(count) {
  if (count >= 8) return "🔴 HOCH";
  if (count >= 4) return "🟠 MITTEL";
  if (count >= 1) return "🟢 NIEDRIG";
  return "⚪ KEINE EINTRÄGE";
}

module.exports = {
  name: "messageCreate",

  async execute(message) {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;

      if (!message.mentions.users.has(message.client.user.id)) return;

      const setup = await GuildSetup.collection.findOne({
        guildId: message.guild.id
      });

      if (!setup) {
        return message.reply("❌ Es wurden noch keine Systeme eingerichtet.");
      }

      const content = message.content.toLowerCase();

      // =========================
      // STRAFEN CHECK
      // =========================

      if (
        content.includes("strafe") ||
        content.includes("kostet") ||
        content.includes("geben") ||
        content.includes("fahrerflucht") ||
        content.includes("rotlicht")
      ) {
        const strafen = setup?.ki?.strafen || {};

        let found = null;

        for (const [typ, betrag] of Object.entries(strafen)) {
          if (content.includes(typ.toLowerCase())) {
            found = {
              typ,
              betrag
            };
            break;
          }
        }

        if (found) {
          const embed = new EmbedBuilder()
            .setTitle("🤖 KI Strafvorschlag")
            .setColor("Orange")
            .addFields(
              {
                name: "Verstoß",
                value: found.typ,
                inline: true
              },
              {
                name: "Empfohlene Strafe",
                value: found.betrag,
                inline: true
              },
              {
                name: "Empfohlene Maßnahmen",
                value:
                  "• Akteneintrag erstellen\n" +
                  "• Situation dokumentieren\n" +
                  "• Bei Wiederholung höhere Maßnahmen prüfen",
                inline: false
              }
            )
            .setFooter({
              text: "KI Behörden Assistent"
            })
            .setTimestamp();

          return message.reply({
            embeds: [embed]
          });
        }
      }

      // =========================
      // AKTEN CHECK
      // =========================

      if (
        content.includes("akte") ||
        content.includes("akten") ||
        content.includes("infos") ||
        content.includes("informationen") ||
        content.includes("analyse")
      ) {
        let withoutMention = message.content
          .replace(`<@${message.client.user.id}>`, "")
          .replace(`<@!${message.client.user.id}>`, "")
          .trim();

        let parts = withoutMention.split(/\s+/);

        let robloxUsername = parts[parts.length - 1];
        robloxUsername = cleanUsername(robloxUsername);

        if (!robloxUsername) {
          return message.reply("❌ Bitte gib einen Roblox User an.");
        }

        const robloxKey = robloxUsername.toLowerCase();

        const entries =
          setup.akteEintraege && setup.akteEintraege[robloxKey]
            ? setup.akteEintraege[robloxKey]
            : [];

        const akten =
          setup.akte && setup.akte.akten
            ? setup.akte.akten
            : {};

        const hasAkteThread = Boolean(akten[`roblox_${robloxKey}`]);

        const latestEntries = entries
          .slice(-5)
          .reverse()
          .map((entry, index) => {
            return (
              `**${index + 1}. ${entry.typ || "Unbekannt"}**\n` +
              `> Strafe: ${entry.strafe || "Keine Angabe"}\n` +
              `> Beschreibung: ${entry.beschreibung || "Keine Angabe"}\n` +
              `> Beamter: ${entry.beamterTag || "Unbekannt"}\n` +
              `> Datum: <t:${entry.timestamp}:F>`
            );
          });

        const lastEntry = entries.length
          ? entries[entries.length - 1]
          : null;

        const embed = new EmbedBuilder()
          .setTitle("📁 KI Aktenprüfung")
          .setColor(entries.length ? "Orange" : "Blue")
          .addFields(
            {
              name: "User",
              value: robloxUsername,
              inline: true
            },
            {
              name: "Akte vorhanden",
              value: hasAkteThread ? "✅ Ja" : "❌ Nein",
              inline: true
            },
            {
              name: "Gespeicherte Einträge",
              value: String(entries.length),
              inline: true
            },
            {
              name: "Gefahrstufe",
              value: getRiskLevel(entries.length),
              inline: true
            },
            {
              name: "Letzte Aktivität",
              value: lastEntry ? `<t:${lastEntry.timestamp}:F>` : "Keine",
              inline: true
            }
          )
          .setFooter({
            text: "KI Behörden Assistent"
          })
          .setTimestamp();

        if (latestEntries.length) {
          embed.addFields({
            name: "Letzte Einträge",
            value: latestEntries.join("\n\n").slice(0, 3900),
            inline: false
          });
        } else {
          embed.addFields({
            name: "Zusammenfassung",
            value: "Zu diesem Roblox User wurden noch keine gespeicherten Einträge gefunden.",
            inline: false
          });
        }

        return message.reply({
          embeds: [embed]
        });
      }

      return message.reply({
        content:
          "🤖 Ich konnte dazu nichts finden.\n" +
          "Beispiele:\n" +
          "`@Bot Welche Strafe bei Fahrerflucht?`\n" +
          "`@Bot Gib mir alle Infos von der Akte von RobloxName`"
      });
    } catch (err) {
      console.error("KI CHAT ERROR:", err);

      return message.reply({
        content: "❌ KI Fehler beim Verarbeiten der Anfrage."
      }).catch(() => {});
    }
  }
};
