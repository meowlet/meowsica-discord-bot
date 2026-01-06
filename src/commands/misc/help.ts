import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types/command.ts";
import { commands } from "../../commands.ts";
import { t, DEFAULT_LOCALE } from "../../i18n/index.ts";
import { getLocale } from "../../settings/db.ts";
import { Colors } from "../../constants/index.ts";

type CommandCategory = "voice" | "tts" | "config" | "misc";

interface CommandInfo {
  name: string;
  description: string;
  category: CommandCategory;
  subcommands?: string[];
}

const getCommandInfo = (cmd: Command, locale: string): CommandInfo => {
  const name = cmd.data.name;
  const description = t(locale, `commands.${name}.description`);

  let category: CommandCategory = "misc";
  let subcommands: string[] | undefined;

  if (name === "join" || name === "leave") {
    category = "voice";
  } else if (name === "say" || name === "stop" || name === "skip" || name === "queue") {
    category = "tts";
  } else if (name === "lang" || name === "voices") {
    category = "config";
    if (name === "lang") {
      subcommands = [
        `\`/lang interface user\` - ${t(locale, "commands.lang.interface.user")}`,
        `\`/lang interface server\` - ${t(locale, "commands.lang.interface.server")}`,
        `\`/lang speech user\` - ${t(locale, "commands.lang.speech.user")}`,
        `\`/lang speech server\` - ${t(locale, "commands.lang.speech.server")}`,
      ];
    }
  } else {
    category = "misc";
  }

  return { name, description, category, subcommands };
};

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription(t(DEFAULT_LOCALE, "commands.help.description")),

  async execute(interaction) {
    const locale = getLocale(interaction);

    const commandInfos = commands.map((cmd) => getCommandInfo(cmd, locale));

    const categories: Record<CommandCategory, CommandInfo[]> = {
      voice: [],
      tts: [],
      config: [],
      misc: [],
    };

    commandInfos.forEach((info) => {
      categories[info.category].push(info);
    });

    const embed = new EmbedBuilder()
      .setTitle(t(locale, "commands.help.title"))
      .setColor(Colors.Primary)
      .setDescription(t(locale, "commands.help.subtitle"));

    if (categories.voice.length > 0) {
      const voiceCommands = categories.voice
        .map((cmd) => `**/${cmd.name}** - ${cmd.description}`)
        .join("\n");
      embed.addFields({
        name: t(locale, "commands.help.categories.voice"),
        value: voiceCommands,
        inline: false,
      });
    }

    if (categories.tts.length > 0) {
      const ttsCommands = categories.tts
        .map((cmd) => `**/${cmd.name}** - ${cmd.description}`)
        .join("\n");
      embed.addFields({
        name: t(locale, "commands.help.categories.tts"),
        value: ttsCommands,
        inline: false,
      });
    }

    if (categories.config.length > 0) {
      const configCommands = categories.config
        .map((cmd) => {
          let text = `**/${cmd.name}** - ${cmd.description}`;
          if (cmd.subcommands && cmd.subcommands.length > 0) {
            text += `\n${cmd.subcommands.map((sub) => `  ${sub}`).join("\n")}`;
          }
          return text;
        })
        .join("\n\n");
      embed.addFields({
        name: t(locale, "commands.help.categories.config"),
        value: configCommands,
        inline: false,
      });
    }

    if (categories.misc.length > 0) {
      const miscCommands = categories.misc
        .map((cmd) => `**/${cmd.name}** - ${cmd.description}`)
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
