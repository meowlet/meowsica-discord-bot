import { createBotClient } from './discord/client';
import { registerEvents } from './discord/events';
import { buildInteractionRouter } from './discord/interaction-router';
import { pingCommand } from './features/misc/ping-command';
import { helpCommand } from './features/misc/help-command';
import { joinCommand } from './features/voice/join-command';
import { leaveCommand } from './features/voice/leave-command';
import type { SlashCommand } from './shared/command';

export function buildBot(): ReturnType<typeof createBotClient> {
  const commands: readonly SlashCommand[] = [pingCommand, helpCommand, joinCommand, leaveCommand];
  const client = createBotClient();
  const router = buildInteractionRouter({ commands, components: [] });
  registerEvents(client, router);
  return client;
}
