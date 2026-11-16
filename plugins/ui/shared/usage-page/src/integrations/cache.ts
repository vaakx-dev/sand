export interface Cached<T> {
  at: number
  summary: T
}

const keyOf = (pc: string, view: string) => `sand.usage.summary.${pc}.${view}`

export const readCache = <T>(pc: string, view: string, valid: (value: unknown) => value is T): Cached<T> | undefined => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(keyOf(pc, view)) ?? 'null')
    if (!saved || typeof saved !== 'object' || !('at' in saved) || !('summary' in saved)) return undefined
    const { at, summary } = saved
    return typeof at === 'number' && valid(summary) ? { at, summary } : undefined
  } catch {
    return undefined
  }
}

export const writeCache = <T>(pc: string, view: string, cached: Cached<T>) => {
  try {
    localStorage.setItem(keyOf(pc, view), JSON.stringify(cached))
  } catch {}
}
