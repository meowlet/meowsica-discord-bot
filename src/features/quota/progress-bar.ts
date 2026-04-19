export interface ProgressBarOptions {
  readonly length?: number;
  readonly filled?: string;
  readonly empty?: string;
}

export function renderProgressBar(
  percentage: number,
  options: ProgressBarOptions = {},
): string {
  const length = options.length ?? 10;
  const filledChar = options.filled ?? "▓";
  const emptyChar = options.empty ?? "░";
  const clamped = Math.max(0, Math.min(100, percentage));
  const filledCount = Math.round((clamped / 100) * length);
  const emptyCount = length - filledCount;
  return `[${filledChar.repeat(filledCount)}${emptyChar.repeat(emptyCount)}]`;
}
