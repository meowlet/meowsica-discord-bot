export function isShardWorker(): boolean {
  return process.env["SHARDING_MANAGER"] === "true";
}
