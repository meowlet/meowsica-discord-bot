import { registerEvents } from "../discord/events.ts";
import { createAppContext } from "./wire.ts";
import { registerShutdown } from "./shutdown.ts";
import type { AppContext } from "./app-context.ts";

export async function start(): Promise<AppContext> {
  const ctx = await createAppContext();
  registerEvents({
    client: ctx.client,
    router: ctx.router,
    logger: ctx.logger,
    readyHandler: ctx.readyHandler,
    voice: ctx.voice,
    guildSettings: ctx.guildSettings,
  });
  registerShutdown(ctx);
  await ctx.client.start();
  return ctx;
}
