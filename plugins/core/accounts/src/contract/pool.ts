import type { LLM, SourceInfo } from './llm'
import type { LimitWindow } from './models'

const current = ({ resetsAt, ...window }: LimitWindow, now: number): LimitWindow => (resetsAt !== undefined && resetsAt <= now ? { ...window, used: 0 } : { ...window, ...(resetsAt !== undefined && { resetsAt }) })

export const heldKey = (account: string, pc?: string) => JSON.stringify([account, pc ?? null])

const windowsOf = (llm: LLM, accounts: SourceInfo[], now: number) => {
  const ids = new Map(accounts.map(({ id, account, pc }) => [heldKey(account ?? id, pc), id]))
  const all = new Map<string, LimitWindow[]>()
  for (const { source, pc, windows } of llm.sourceLimits?.() ?? []) {
    const id = ids.get(heldKey(source, pc)) ?? source
    all.set(id, [...(all.get(id) ?? []), ...windows.map(window => current(window, now))])
  }
  return all
}

export const windowsBySource = (llm: LLM, now = Date.now()) => windowsOf(llm, llm.accounts?.() ?? [], now)

export const unavailable = (llm: LLM, now = Date.now()) => {
  const accounts = llm.accounts?.() ?? []
  const offline = accounts.filter(account => account.online === false).map(account => account.id)
  const spent = [...windowsOf(llm, accounts, now)].filter(([, windows]) => windows.some(window => window.used >= 1)).map(([source]) => source)
  return new Set([...offline, ...spent])
}
