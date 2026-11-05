export const percent = (fraction: number) => `${Math.round(fraction * 100)}%`

export const leftOf = (window: { used: number }) => Math.max(0, Math.min(1, 1 - window.used))
