import { createConsola } from "consola";

export const logger = createConsola({
  level: Bun.env["DEBUG"] ? 4 : 3,
  formatOptions: {
    label: true,
    date: true,
    colors: true,
    compact: true,
  },
});

export const botLogger = logger.withTag("BOT");
export const voiceLogger = logger.withTag("VOICE");
export const ttsLogger = logger.withTag("TTS");
export const commandLogger = logger.withTag("CMD");
