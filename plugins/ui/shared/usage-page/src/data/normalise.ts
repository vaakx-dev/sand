import { accountKey, type AccountUsage, type Spend, type UsageHistory } from '@sand/usage/contract'
import { addSpend } from './totals'
import type { Pc } from './types'

type NameOf = (id: string) => string | undefined

const owned = (account: AccountUsage, pc: Pc, nameOf: NameOf): AccountUsage => {
  const owner = account.pc ?? pc.id
  return {
    ...account,
    key: accountKey({ source: account.source, pc: owner }),
    pc: owner,
    pcName: nameOf(owner) ?? account.pcName ?? (account.pc ? 'another PC' : pc.name),
  }
}

export const normaliseHistory = (history: UsageHistory, pc: Pc, nameOf: NameOf): UsageHistory => {
  const accounts = history.accounts.map(account => owned(account, pc, nameOf))
  const keys = new Map(history.accounts.map((account, index) => [account.key, accounts[index]!.key]))
  const remap = (record: Record<string, Spend>) => {
    const next: Record<string, Spend> = {}
    for (const [key, spend] of Object.entries(record)) {
      const owner = keys.get(key) ?? key
      next[owner] = addSpend(next[owner], spend)
    }
    return next
  }
  return { ...history, accounts, periods: history.periods.map(period => ({ ...period, accounts: remap(period.accounts) })) }
}
