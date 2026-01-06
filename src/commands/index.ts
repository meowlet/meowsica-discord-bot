import type { Command } from "../types/command.ts";
import { ping } from "./ping.ts";
import { help } from "./help.ts";
import { lang } from "./lang.ts";
import { join } from "./join.ts";
import { leave } from "./leave.ts";
import { say } from "./say.ts";
import { stop } from "./stop.ts";
import { skip } from "./skip.ts";
import { voices } from "./voices.ts";
import { queue } from "./queue.ts";

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
