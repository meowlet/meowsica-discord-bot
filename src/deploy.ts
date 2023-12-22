import { REST, Routes } from "discord.js";
import { createAppContext } from "./bootstrap/wire.ts";
import { closeAppContext } from "./bootstrap/cleanup.ts";
import type { AppContext } from "./bootstrap/app-context.ts";

async function deploy(): Promise<void> {
  const ctx = await createAppContext();
  let exitCode = 0;
  try {
    await deployCommands(ctx);
  } catch (err) {
    ctx.logger.error("deploy failed", err);
    exitCode = 1;
  } finally {
    await closeAppContext(ctx);
  }
  process.exit(exitCode);
}

async function deployCommands(ctx: AppContext): Promise<void> {
  const { token, clientId, guildId, nodeEnv } = ctx.config.bot;
  const isProduction = nodeEnv === "production";
  if (!isProduction && !guildId) {
    throw new Error("DISCORD_GUILD_ID is required for development deploy");
  }
  const rest = new REST().setToken(token);
  const body = ctx.commands.map((cmd) => cmd.data.toJSON());
  ctx.logger.info(
    `deploying ${body.length} commands: ${ctx.commands.map((c) => c.data.name).join(", ")}`,
  );
  if (isProduction) {
    await rest.put(Routes.applicationCommands(clientId), { body });
    ctx.logger.info(`[prod] deployed ${body.length} global commands`);
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: [],
      });
      ctx.logger.info("[prod] cleared guild-specific commands");
    }
    return;
  }
  await rest.put(Routes.applicationGuildCommands(clientId, guildId!), { body });
  ctx.logger.info(`[dev] deployed ${body.length} guild commands`);
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
  ctx.logger.info("[dev] cleared global commands");
}

deploy().catch((err) => {
  console.error("deploy bootstrap failed", err);
  process.exit(1);
});
