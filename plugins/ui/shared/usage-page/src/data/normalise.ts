import type { AccountUsage, UsageSummary, UsageTotals } from '@sand/usage/contract'
import { accountKey } from '@sand/kit'
import { ownsLimits } from './limits'
import { addRecord } from './totals'
import type { Pc } from './types'

const owned = (account: AccountUsage, pc: Pc, nameOf: (id: string) => string | undefined): AccountUsage => {
  const owner = account.pc ?? pc.id
  return {
    ...account,
    key: accountKey({ source: account.source, pc: owner }),
    pc: owner,
    pcName: nameOf(owner) ?? account.pcName ?? (account.pc ? 'another PC' : pc.name),
  }
}

const withSummaryLimits = (account: AccountUsage, summary: UsageSummary, pc: Pc) =>
  !account.limits && summary.limits && ownsLimits(account, summary.limits, pc.id) ? { ...account, limits: summary.limits } : account

export const normalise = (summary: UsageSummary, pc: Pc, nameOf: (id: string) => string | undefined): UsageSummary => {
  const keys = new Map<string, string>()
  const accounts = summary.accounts.map(account => {
    const next = withSummaryLimits(owned(account, pc, nameOf), summary, pc)
    keys.set(account.key, next.key)
    return next
  })
  const remap = (key: string) => keys.get(key) ?? key
  const remapAll = (list: string[]) => [...new Set(list.map(remap))]
  const remapRecord = (record: Record<string, UsageTotals>) => {
    const next: Record<string, UsageTotals> = {}
    for (const [key, totals] of Object.entries(record)) addRecord(next, remap(key), totals)
    return next
  }
  return {
    ...summary,
    accounts,
    models: summary.models.map(model => ({ ...model, account: remap(model.account) })),
    periods: summary.periods.map(period => ({ ...period, accounts: remapRecord(period.accounts) })),
    threads: summary.threads.map(thread => ({ ...thread, accounts: remapAll(thread.accounts) })),
    projects: summary.projects.map(project => ({ ...project, accounts: remapAll(project.accounts) })),
  }
}
