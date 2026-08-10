export function projectName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) || "Workspace";
}

export function relativeTime(value: string, now = Date.now()): string {
  const elapsed = now - Date.parse(value);
  if (!Number.isFinite(elapsed) || elapsed < 60_000) return "now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`;
  return `${Math.floor(elapsed / 86_400_000)}d`;
}

export function workingDuration(value: string, now = Date.now()): string {
  const elapsed = Math.max(0, now - Date.parse(value));
  if (!Number.isFinite(elapsed)) return "";
  if (elapsed < 60_000) return `${Math.max(1, Math.floor(elapsed / 1_000))}s`;
  return relativeTime(value, now);
}
