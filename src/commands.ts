import type { Command } from "./types/command.ts";
import { ping } from "./commands/misc/ping.ts";
import { help } from "./commands/misc/help.ts";
import { lang } from "./commands/config/lang.ts";
import { join } from "./commands/voice/join.ts";
import { leave } from "./commands/voice/leave.ts";
import { say } from "./commands/tts/say.ts";
import { stop } from "./commands/tts/stop.ts";
import { skip } from "./commands/tts/skip.ts";
import { voices } from "./commands/config/voices.ts";
import { voice } from "./commands/misc/voice.ts";
import { queue } from "./commands/tts/queue.ts";
import { encoreAdmin } from "./commands/admin/premium.ts";

export const commands: Command[] = [
  ping,
  help,
  lang,
  join,
  leave,
  say,
  stop,
  skip,
  voices,
  voice,
  queue,
  encoreAdmin,
];

