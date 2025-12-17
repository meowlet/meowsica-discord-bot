import { consola, createConsola } from "consola";

export const logger = createConsola({
  level: process.env.DEBUG ? 4 : 3, // 4 = debug, 3 = info
  formatOptions: {
    label: true,
    date: true,
    colors: true,
    compact: true,
  },
});

// Tag-based loggers for different parts of the bot
export const botLogger = logger.withTag("BOT");
export const voiceLogger = logger.withTag("VOICE");
export const ttsLogger = logger.withTag("TTS");
export const commandLogger = logger.withTag("CMD");
