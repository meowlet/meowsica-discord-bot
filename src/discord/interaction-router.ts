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
