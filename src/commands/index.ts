import type { Command } from "../types/command.ts";
import { ping } from "./ping.ts";
import { help } from "./help.ts";
import { lang } from "./lang.ts";
import { join } from "./join.ts";
import { leave } from "./leave.ts";

export const commands: Command[] = [ping, help, lang, join, leave];
