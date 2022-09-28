import {
  DiscordAPIError,
  MessageFlags,
  RESTJSONErrorCodes,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
  type StringSelectMenuInteraction,
} from "discord.js";
import type { Logger } from "../shared/logger.ts";
import type {
  Command,
  ComponentHandler,
  ComponentInteraction,
} from "../shared/command.ts";
import type { LocaleResolver } from "../features/settings/locale-resolver.ts";
import type {
  CommandLoggerService,
  CommandLogEntry,
} from "../features/logs/command-logger-service.ts";
import {
  type InteractionContextService,
  type InteractionContextStore,
} from "../shared/interaction-context.ts";
import { QuotaExceededError } from "../shared/errors.ts";
import { t } from "../i18n/translate.ts";

export interface InteractionRouterDeps {
  readonly logger: Logger;
  readonly commands: readonly Command[];
  readonly componentHandlers: readonly ComponentHandler[];
  readonly localeResolver: LocaleResolver;
  readonly commandLogger: CommandLoggerService;
  readonly interactionContext: InteractionContextService;
}

export class InteractionRouter {
  private readonly logger: Logger;
  private readonly commands: Map<string, Command>;
  private readonly componentHandlers: readonly ComponentHandler[];
  private readonly localeResolver: LocaleResolver;
  private readonly commandLogger: CommandLoggerService;
  private readonly interactionContext: InteractionContextService;

  constructor(deps: InteractionRouterDeps) {
    this.logger = deps.logger.withTag("ROUTER");
    this.commands = new Map(deps.commands.map((cmd) => [cmd.data.name, cmd]));
    this.componentHandlers = deps.componentHandlers;
    this.localeResolver = deps.localeResolver;
    this.commandLogger = deps.commandLogger;
    this.interactionContext = deps.interactionContext;
  }

  async route(interaction: Interaction): Promise<void> {
    const store = this.buildStore(interaction);
    await this.interactionContext.run(store, async () => {
      if (interaction.isChatInputCommand()) {
        await this.handleCommand(interaction);
        return;
      }
      if (interaction.isButton() || interaction.isStringSelectMenu()) {
        await this.handleComponent(interaction);
        return;
      }
      this.logger.debug(
        `ignored unsupported interaction type: ${interaction.type}`,
      );
    });
  }

  private async handleCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const command = this.commands.get(interaction.commandName);
    const locale = await this.localeResolver.resolve(interaction);
    if (!command) {
      this.logger.warn(`unknown command ${interaction.commandName}`);
      this.commandLogger.log(this.entryFor(interaction, "error"));
      try {
        await interaction.reply({
          content: t(locale, "common.unknownCommand"),
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        if (!isAcknowledgmentError(err)) {
          this.logger.warn("failed to reply unknown command", err);
        }
      }
      return;
    }
    const shouldAutoLog = !command.selfLog;
    try {
      this.logger.info(
        `/${interaction.commandName} by ${interaction.user.tag}`,
      );
      await command.execute(interaction);
      if (shouldAutoLog) {
        this.commandLogger.log(this.entryFor(interaction, "success"));
      }
    } catch (err) {
