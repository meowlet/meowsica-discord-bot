import { start } from "./bootstrap/start.ts";

start().catch((err) => {
  console.error("fatal: bot worker failed to start", err);
  process.exit(1);
});
