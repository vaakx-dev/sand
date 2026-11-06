export const random = (seed: number) => {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (low: number, high: number) => low + Math.floor(next() * (high - low + 1))
  const shuffle = <T>(items: readonly T[]) => {
    const out = [...items]
    for (let at = out.length - 1; at > 0; at--) {
      const other = int(0, at)
      const kept = out[at]!
      out[at] = out[other]!
      out[other] = kept
    }
    return out
  }
  return { next, int, shuffle, pick: <T>(items: readonly T[]) => items[int(0, items.length - 1)]!, some: <T>(items: readonly T[], count: number) => shuffle(items).slice(0, count) }
}

export type Random = ReturnType<typeof random>
