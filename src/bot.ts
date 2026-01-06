







import { BotClient } from "./structs/BotClient.ts";
import { registerEvents } from "./events/index.ts";
import { getConfig } from "./config/index.ts";
import { botLogger } from "./utils/logger.ts";




export function createBot(): BotClient {
  const config = getConfig();

  botLogger.info("Creating bot client...");

  const client = new BotClient({ config });

  
  registerEvents(client);

  return client;
}




export async function startBot(): Promise<BotClient> {
  const client = createBot();

  try {
    await client.start();
    return client;
  } catch (error) {
    botLogger.error("Failed to start bot:", error);
    process.exit(1);
  }
}



if (import.meta.main) {
  const config = getConfig();
  const isSharded = process.env.SHARD_ID !== undefined;

  if (isSharded) {
    botLogger.info(`Starting as shard ${process.env.SHARD_ID}...`);
  } else {
    botLogger.info("Starting in direct mode...");
  }

  startBot();
}

export { BotClient };

