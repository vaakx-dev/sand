import type { Limits } from '@sand/accounts/contract'
import type { AccountUsage } from '@sand/usage/contract'
import { accountKey, emptyTotals } from '@sand/usage/records'
import { providerOf, sourceName } from '../names'
import type { Account, Pc } from './types'

export const ownsLimits = (account: AccountUsage, limits: Limits, home: string) =>
  account.source === limits.source && account.pc === (limits.pc ?? home)

export const newest = (a?: Limits, b?: Limits) => {
  if (!a || !b) return a ?? b
  return b.updated > a.updated ? b : a
}

const unusedAccount = (limits: Limits, home: Pc): Account => {
  const { source } = limits
  const pc = limits.pc ?? home.id
  return {
    ...emptyTotals(),
    key: accountKey({ source, pc }),
    source,
    label: sourceName(source),
    provider: providerOf(source),
    billing: 'plan',
    pc,
    pcName: limits.pcName ?? home.name,
    limits,
    machines: [],
  }
}

const applyOne = (accounts: Account[], live: Limits, home: Pc, addMissing: boolean) => {
  const owns = (account: Account) => ownsLimits(account, live, home.id)
  if (accounts.some(owns)) return accounts.map(account => (owns(account) ? { ...account, limits: newest(account.limits, live) } : account))
  return addMissing && live.windows.length ? [...accounts, unusedAccount(live, home)] : accounts
}

export const withLiveLimits = (accounts: Account[], live: Limits[], home: Pc | undefined, addMissing: boolean) =>
  home ? live.reduce((list, limits) => applyOne(list, limits, home, addMissing), accounts) : accounts
