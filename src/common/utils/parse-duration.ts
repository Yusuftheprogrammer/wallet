const MULTIPLIERS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDuration(duration: string, fallbackMs = 7 * 86_400_000): number {
  const match = duration.trim().match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackMs;
  return parseInt(match[1], 10) * MULTIPLIERS[match[2].toLowerCase()];
}
