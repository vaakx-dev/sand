import type { LLM } from './llm'
import type { LimitWindow, ModelInfo } from './models'

const HEADROOM = 0.9

const current = ({ resetsAt, ...window }: LimitWindow, now: number): LimitWindow => (resetsAt !== undefined && resetsAt <= now ? { ...window, used: 0 } : { ...window, ...(resetsAt !== undefined && { resetsAt }) })

const nameOf = (model: ModelInfo) => model.name ?? model.id

const windowsBySource = (llm: LLM, now: number) => {
  const all = new Map<string, LimitWindow[]>()
  for (const { source, windows } of llm.sourceLimits?.() ?? []) all.set(source, [...(all.get(source) ?? []), ...windows.map(window => current(window, now))])
  return all
}

const fullest = (windows: LimitWindow[]) => Math.max(0, ...windows.map(window => window.used))

const span = (window: LimitWindow, now: number) => window.duration ?? (window.resetsAt === undefined ? 0 : window.resetsAt - now)

const longest = (windows: LimitWindow[], now: number) => windows.reduce<LimitWindow | undefined>((long, window) => (!long || span(window, now) > span(long, now) ? window : long), undefined)

const budgetExpires = (windows: LimitWindow[], now: number) => longest(windows, now)?.resetsAt ?? Infinity

export const outOfUsage = (llm: LLM, now = Date.now()) => new Set([...windowsBySource(llm, now)].filter(([, windows]) => fullest(windows) >= 1).map(([source]) => source))

export const planSiblings = (llm: LLM, model: ModelInfo): ModelInfo[] => {
  const sources = new Map((llm.sources?.() ?? []).map(source => [source.id, source]))
  const usable = (found: ModelInfo) => {
    const source = sources.get(found.source ?? '')
    return source?.billing === 'plan' && source.online !== false
  }
  return (llm.models?.() ?? []).filter(found => nameOf(found) === nameOf(model) && usable(found))
}

export const drainOrder = (llm: LLM, models: ModelInfo[], now = Date.now()): ModelInfo[] => {
  const windows = windowsBySource(llm, now)
  const ranked = models.map((model, at) => {
    const found = windows.get(model.source ?? '') ?? []
    return { model, at, used: fullest(found), expires: budgetExpires(found, now) }
  })
  const tight = (used: number) => (used >= HEADROOM ? 1 : 0)
  return ranked
    .filter(entry => entry.used < 1)
    .sort((a, b) => tight(a.used) - tight(b.used) || a.expires - b.expires || a.used - b.used || a.at - b.at)
    .map(entry => entry.model)
}
