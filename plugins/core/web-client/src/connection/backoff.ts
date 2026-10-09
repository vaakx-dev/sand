export const retryDelay = (failures: number) => Math.min(30_000, 1000 * 2 ** failures) * (0.5 + Math.random() * 0.5)
