import { join } from "node:path";
import { loadAppEnvConfig } from "./config/index.ts";
import { createRootLogger } from "./shared/logger.ts";
import { ShardingFactory } from "./discord/sharding.ts";
import { start } from "./bootstrap/start.ts";

async function main(): Promise<void> {
  const config = loadAppEnvConfig();
  const logger = createRootLogger({
    level: config.bot.logLevel,
    jsonMode: config.bot.nodeEnv === "production",
  });
  if (!config.sharding.enabled) {
    await start();
    return;
  }
  const factory = new ShardingFactory({
    token: config.bot.token,
    botFile: join(import.meta.dir, "bot.ts"),
    sharding: config.sharding,
    logger,
  });
  const manager = factory.create();
  await factory.start(manager);
}

main().catch((err) => {
  console.error("fatal startup error", err);
  process.exit(1);
});
