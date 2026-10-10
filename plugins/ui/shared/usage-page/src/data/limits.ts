import type { Limits } from '@sand/llm-accounts/contract'
import type { AccountUsage } from '@sand/usage/contract'
import { accountKey } from '@sand/kit'
import { providerOf, sourceName } from '../names'
import { emptyTotals } from './totals'
import type { Account, Pc } from './types'

const sourceOf = (limits: Limits) => limits.source ?? 'claude'

export const ownsLimits = (account: AccountUsage, limits: Limits, home: string) =>
  account.source === sourceOf(limits) && account.pc === (limits.pc ?? home)

export const newest = (a?: Limits, b?: Limits) => (!a ? b : !b ? a : b.updated > a.updated ? b : a)

const placeholder = (limits: Limits, home: Pc): Account => {
  const source = sourceOf(limits)
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
    threads: 0,
    limits,
    machines: [],
  }
}

const applyOne = (accounts: Account[], live: Limits, home: Pc, addMissing: boolean) => {
  if (accounts.some(account => ownsLimits(account, live, home.id)))
    return accounts.map(account => (ownsLimits(account, live, home.id) ? { ...account, limits: newest(account.limits, live) } : account))
  return addMissing && live.windows.length ? [...accounts, placeholder(live, home)] : accounts
}

export const withLiveLimits = (accounts: Account[], live: Limits[], home: Pc | undefined, addMissing: boolean) =>
  home ? live.reduce((list, limits) => applyOne(list, limits, home, addMissing), accounts) : accounts
