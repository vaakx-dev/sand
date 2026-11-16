import type { Limits, LimitWindow, SourceInfo } from '@sand/accounts/contract'
import { accountKey, type AccountUsage, type Member } from '@sand/usage/contract'
import { grouped } from '@sand/util'

export interface PoolAccount {
  key: string
  label: string
  pcName: string
  plan?: string
  windows: LimitWindow[]
  updated: number
}

export interface PlanWindow {
  id: string
  label: string
  members: Member[]
}

export interface Plan {
  kind: string
  label: string
  provider: string
  accounts: PoolAccount[]
  windows: PlanWindow[]
}

interface PoolSources {
  accounts: AccountUsage[]
  live: Limits[]
  sources: SourceInfo[]
  home: string
}

const pooled = (account: AccountUsage) => account.billing === 'plan' && !!account.kind

const newest = (saved?: Limits, live?: Limits) => (!saved || (live && live.updated > saved.updated) ? live : saved)

const poolAccount = (account: AccountUsage, limits?: Limits): PoolAccount => ({
  key: account.key,
  label: account.label,
  pcName: account.pcName ?? '',
  ...(account.plan && { plan: account.plan }),
  windows: limits?.windows ?? [],
  updated: limits?.updated ?? 0,
})

const windowsOf = (accounts: PoolAccount[]) => {
  const windows = new Map<string, PlanWindow>()
  for (const account of accounts)
    for (const window of account.windows) grouped(windows, window.id, (): PlanWindow => ({ id: window.id, label: window.label, members: [] })).members.push({ account: account.key, window })
  return [...windows.values()]
}

export const plansOf = ({ accounts, live, sources, home }: PoolSources): Plan[] => {
  const fresh = new Map(live.map(limits => [accountKey({ source: limits.source, pc: limits.pc ?? home }), limits]))
  const byKind = new Map<string, Plan>()
  for (const account of accounts.filter(pooled)) {
    const kind = account.kind ?? ''
    const label = sources.find(source => source.id === kind)?.label ?? account.label
    grouped(byKind, kind, (): Plan => ({ kind, label, provider: account.provider, accounts: [], windows: [] })).accounts.push(poolAccount(account, newest(account.limits, fresh.get(account.key))))
  }
  return [...byKind.values()].map(plan => ({ ...plan, windows: windowsOf(plan.accounts) })).filter(plan => plan.windows.length)
}

export const lastChecked = (plans: Plan[]) => Math.max(0, ...plans.flatMap(plan => plan.accounts.map(account => account.updated)))
