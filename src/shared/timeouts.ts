const ACTIVE = new Set<ReturnType<typeof setTimeout>>();

export function schedule(ms: number, fn: () => void): () => void {
  const h = setTimeout(() => {
    ACTIVE.delete(h);
    fn();
  }, ms);
  ACTIVE.add(h);
  return () => {
    ACTIVE.delete(h);
    clearTimeout(h);
  };
}

export function clearAll(): void {
  for (const h of ACTIVE) clearTimeout(h);
  ACTIVE.clear();
}
