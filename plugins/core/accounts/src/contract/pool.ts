import type { LLM } from './llm'
import type { LimitWindow } from './models'

const current = ({ resetsAt, ...window }: LimitWindow, now: number): LimitWindow => (resetsAt !== undefined && resetsAt <= now ? { ...window, used: 0 } : { ...window, ...(resetsAt !== undefined && { resetsAt }) })

export const windowsBySource = (llm: LLM, now = Date.now()) => {
  const all = new Map<string, LimitWindow[]>()
  for (const { source, windows } of llm.sourceLimits?.() ?? []) all.set(source, [...(all.get(source) ?? []), ...windows.map(window => current(window, now))])
  return all
}

export const outOfUsage = (llm: LLM, now = Date.now()) =>
  new Set([...windowsBySource(llm, now)].filter(([, windows]) => windows.some(window => window.used >= 1)).map(([source]) => source))
