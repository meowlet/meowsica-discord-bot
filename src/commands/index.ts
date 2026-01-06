import type { Command } from "../types/command.ts";
import { ping } from "./misc/ping.ts";
import { help } from "./misc/help.ts";
import { lang } from "./config/lang.ts";
import { join } from "./voice/join.ts";
import { leave } from "./voice/leave.ts";
import { say } from "./tts/say.ts";
import { stop } from "./tts/stop.ts";
import { skip } from "./tts/skip.ts";
import { voices } from "./config/voices.ts";
import { queue } from "./tts/queue.ts";

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
  queue,
];
