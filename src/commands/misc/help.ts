import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types/command.ts";
import { commands } from "../../commands.ts";
import { t, DEFAULT_LOCALE } from "../../i18n/index.ts";
import { getLocale } from "../../settings/db.ts";
import { Colors } from "../../constants/index.ts";

type CommandCategory = "voice" | "tts" | "settings" | "misc";

interface CommandInfo {
  name: string;
  description: string;
  category: CommandCategory;
}

const getCommandInfo = (cmd: Command, locale: string): CommandInfo => {
  const name = cmd.data.name;
  const description = t(locale, `commands.${name}.description`);

  let category: CommandCategory = "misc";

  // Voice commands
  if (name === "join" || name === "leave") {
    category = "voice";
  }
  // TTS commands
  else if (name === "say" || name === "stop" || name === "skip" || name === "queue") {
    category = "tts";
  }
  // Settings commands (dashboard-style)
  else if (name === "voice" || name === "language") {
    category = "settings";
  }
  // Misc commands
  else if (name === "ping" || name === "help") {
    category = "misc";
  }

  return { name, description, category };
};

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription(t(DEFAULT_LOCALE, "commands.help.description")),

  async execute(interaction) {
    const locale = getLocale(interaction);

    // Filter out admin commands from help display
    const visibleCommands = commands.filter(cmd => cmd.data.name !== "encoreadmin");
    const commandInfos = visibleCommands.map((cmd) => getCommandInfo(cmd, locale));

    const categories: Record<CommandCategory, CommandInfo[]> = {
      voice: [],
      tts: [],
      settings: [],
      misc: [],
    };

    commandInfos.forEach((info) => {
      categories[info.category].push(info);
    });

    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.help.title"))
      .setColor(Colors.Primary)
      .setDescription(t(locale, "commands.help.subtitle"));

    // 🎤 Voice Commands
    if (categories.voice.length > 0) {
      const voiceCommands = categories.voice
        .map((cmd) => `**/${cmd.name}** — ${cmd.description}`)
        .join("\n");
      embed.addFields({
        name: t(locale, "commands.help.categories.voice"),
        value: voiceCommands,
        inline: false,
      });
    }

    // 🎵 TTS Commands
    if (categories.tts.length > 0) {
      const ttsCommands = categories.tts
        .map((cmd) => `**/${cmd.name}** — ${cmd.description}`)
        .join("\n");
      embed.addFields({
        name: t(locale, "commands.help.categories.tts"),
        value: ttsCommands,
        inline: false,
      });
    }

    // ⚙️ Settings Commands
    if (categories.settings.length > 0) {
      const settingsCommands = categories.settings
        .map((cmd) => `**/${cmd.name}** — ${cmd.description}`)
        .join("\n");
      embed.addFields({
        name: t(locale, "commands.help.categories.settings"),
        value: settingsCommands,
        inline: false,
      });
    }

    // 🛠️ Utility Commands
    if (categories.misc.length > 0) {
      const miscCommands = categories.misc
        .map((cmd) => `**/${cmd.name}** — ${cmd.description}`)
        .join("\n");
      embed.addFields({
        name: t(locale, "commands.help.categories.misc"),
        value: miscCommands,
        inline: false,
      });
    }

    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
