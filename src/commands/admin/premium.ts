import { EmbedBuilder, SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../../types/command.ts";
import { t } from "../../i18n/index.ts";
import en from "../../i18n/locales/en.ts";
import vi from "../../i18n/locales/vi.ts";
import { getLocale } from "../../settings/db.ts";
import { Colors } from "../../constants/index.ts";
import { getConfig } from "../../config/index.ts";
import {
  setUserPremium,
  removeUserPremium,
  getPremiumStatus,
} from "../../settings/db.ts";

const ENCORE_EMOJI = "✨";

export const encoreAdmin: Command = {
  data: new SlashCommandBuilder()
    .setName("encore-admin")
    .setDescription(en.commands.encoreAdmin.description)
    .setDescriptionLocalizations({
      vi: vi.commands.encoreAdmin.description,
    })
    .addSubcommand((subcommand) =>
      subcommand
        .setName("grant")
        .setDescription(en.commands.encoreAdmin.grant.description)
        .setDescriptionLocalizations({
          vi: vi.commands.encoreAdmin.grant.description,
        })
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription(en.commands.encoreAdmin.grant.userOptionDesc)
            .setDescriptionLocalizations({
              vi: vi.commands.encoreAdmin.grant.userOptionDesc,
            })
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("days")
            .setDescription(en.commands.encoreAdmin.grant.daysOptionDesc)
            .setDescriptionLocalizations({
              vi: vi.commands.encoreAdmin.grant.daysOptionDesc,
            })
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(365),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("revoke")
        .setDescription(en.commands.encoreAdmin.revoke.description)
        .setDescriptionLocalizations({
          vi: vi.commands.encoreAdmin.revoke.description,
        })
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription(en.commands.encoreAdmin.revoke.userOptionDesc)
            .setDescriptionLocalizations({
              vi: vi.commands.encoreAdmin.revoke.userOptionDesc,
            })
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("check")
        .setDescription(en.commands.encoreAdmin.check.description)
        .setDescriptionLocalizations({
          vi: vi.commands.encoreAdmin.check.description,
        })
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription(en.commands.encoreAdmin.check.userOptionDesc)
            .setDescriptionLocalizations({
              vi: vi.commands.encoreAdmin.check.userOptionDesc,
            })
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    const locale = getLocale(interaction);
    const config = getConfig();

    if (!config.ownerId || interaction.user.id !== config.ownerId) {
      await interaction.reply({
        content: t(locale, "commands.encoreAdmin.noPermission"),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser("user", true);

    if (subcommand === "grant") {
      const days = interaction.options.getInteger("days");
      setUserPremium(targetUser.id, days);

      const embed = new EmbedBuilder()
        .setTitle(`${ENCORE_EMOJI} ${t(locale, "commands.encoreAdmin.grant.success")}`)
        .setColor(Colors.Success)
        .setDescription(
          days
            ? t(locale, "commands.encoreAdmin.grant.grantedDays", {
                user: targetUser.tag,
                days: days.toString(),
              })
            : t(locale, "commands.encoreAdmin.grant.grantedLifetime", {
                user: targetUser.tag,
              }),
        );

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else if (subcommand === "revoke") {
      removeUserPremium(targetUser.id);

      const embed = new EmbedBuilder()
        .setTitle(t(locale, "commands.encoreAdmin.revoke.success"))
        .setColor(Colors.Warning)
        .setDescription(
          t(locale, "commands.encoreAdmin.revoke.revoked", {
            user: targetUser.tag,
          }),
        );

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else if (subcommand === "check") {
      const status = getPremiumStatus(targetUser.id);

      const embed = new EmbedBuilder()
        .setTitle(`${ENCORE_EMOJI} ${t(locale, "commands.encoreAdmin.check.title")}`)
        .setColor(status.isPremium ? Colors.Success : Colors.Error)
        .addFields(
          {
            name: t(locale, "commands.encoreAdmin.check.user"),
            value: targetUser.tag,
            inline: true,
          },
          {
            name: t(locale, "commands.encoreAdmin.check.status"),
            value: status.isPremium
              ? t(locale, "commands.encoreAdmin.check.active")
              : status.isExpired
                ? t(locale, "commands.encoreAdmin.check.expired")
                : t(locale, "commands.encoreAdmin.check.inactive"),
            inline: true,
          },
        );

      if (status.expiresAt) {
        embed.addFields({
          name: t(locale, "commands.encoreAdmin.check.expiresAt"),
          value: `<t:${Math.floor(status.expiresAt.getTime() / 1000)}:F>`,
          inline: true,
        });
      } else if (status.isPremium) {
        embed.addFields({
          name: t(locale, "commands.encoreAdmin.check.expiresAt"),
          value: t(locale, "commands.encoreAdmin.check.lifetime"),
          inline: true,
        });
      }

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};

