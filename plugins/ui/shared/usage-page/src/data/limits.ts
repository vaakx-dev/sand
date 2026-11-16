import type { Limits, SourceInfo } from '@sand/accounts/contract'
import { accountKey, type AccountUsage, emptyTotals } from '@sand/usage/contract'
import type { Account, Pc } from './types'

interface LiveOptions {
  home: Pc | undefined
  addMissing: boolean
  sources: SourceInfo[]
}

export const ownsLimits = (account: AccountUsage, limits: Limits, home: string) =>
  account.source === limits.source && account.pc === (limits.pc ?? home)

export const newest = (a?: Limits, b?: Limits) => {
  if (!a || !b) return a ?? b
  return b.updated > a.updated ? b : a
}

const unusedAccount = (limits: Limits, home: Pc, sources: SourceInfo[]): Account => {
  const { source } = limits
  const pc = limits.pc ?? home.id
  const known = sources.find(found => found.id === source)
  return {
    ...emptyTotals(),
    key: accountKey({ source, pc }),
    source,
    label: known?.label ?? source,
    provider: known?.provider ?? 'unknown',
    billing: 'plan',
    pc,
    pcName: limits.pcName ?? home.name,
    limits,
    machines: [],
  }
}

const applyOne = (accounts: Account[], live: Limits, home: Pc, { addMissing, sources }: LiveOptions) => {
  const owns = (account: Account) => ownsLimits(account, live, home.id)
  if (accounts.some(owns)) return accounts.map(account => (owns(account) ? { ...account, limits: newest(account.limits, live) } : account))
  return addMissing && live.windows.length ? [...accounts, unusedAccount(live, home, sources)] : accounts
}

export const withLiveLimits = (accounts: Account[], live: Limits[], options: LiveOptions) => {
  const { home } = options
  return home ? live.reduce((list, limits) => applyOne(list, limits, home, options), accounts) : accounts
}
