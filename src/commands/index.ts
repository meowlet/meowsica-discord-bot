import type { Command } from "../types/command.ts";
import { ping } from "./ping.ts";
import { help } from "./help.ts";
import { lang } from "./lang.ts";

export const commands: Command[] = [ping, help, lang];
