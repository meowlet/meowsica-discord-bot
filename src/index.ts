import { getConfig } from "./config/index.ts";
import {
  createShardManager,
  startShardManager,
} from "./structs/ShardManager.ts";
import { startBot } from "./bot.ts";
import { logger } from "./utils/logger.ts";
import { join } from "node:path";

const mainLogger = logger.withTag("MAIN");

async function main(): Promise<void> {
  mainLogger.info("Starting bot...");
  const config = getConfig();
  if (config.enableSharding) {
    await startWithSharding(config);
  } else {
    await startDirect(config);
  }
}

async function startWithSharding(
  config: ReturnType<typeof getConfig>,
): Promise<void> {
  const botFile = join(import.meta.dir, "bot.ts");
  const manager = createShardManager({
    config,
    botFile,
  });
  await startShardManager(manager);
  setupShutdown(() => {
    process.exit(0);
  });
}

async function startDirect(
  config: ReturnType<typeof getConfig>,
): Promise<void> {
  const client = await startBot();
  setupShutdown(async () => {
    await client.shutdown();
    process.exit(0);
  });
}

function setupShutdown(handler: () => void | Promise<void>): void {
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

  for (const signal of signals) {
    process.on(signal, () => {
      handler();
    });
  }

  process.on("uncaughtException", (error) => {
    mainLogger.error("Uncaught exception:", error);
    handler();
  });

  process.on("unhandledRejection", (reason) => {
    mainLogger.error("Unhandled rejection:", reason);
  });
}

main().catch((error) => {
  mainLogger.error("Fatal error:", error);
  process.exit(1);
});
