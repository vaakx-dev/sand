const window = 60_000
const perAddress = 5
const overall = 30

export const createLimits = () => {
  const recent = new Map<string, number[]>()

  const sweep = (now: number) => {
    for (const [address, times] of recent) {
      const kept = times.filter(time => now - time < window)
      if (kept.length) recent.set(address, kept)
      else recent.delete(address)
    }
  }

  return (address: string) => {
    const now = Date.now()
    sweep(now)
    const total = [...recent.values()].reduce((sum, times) => sum + times.length, 0)
    const times = recent.get(address) ?? []
    if (times.length >= perAddress || total >= overall) return false
    recent.set(address, [...times, now])
    return true
  }
}
