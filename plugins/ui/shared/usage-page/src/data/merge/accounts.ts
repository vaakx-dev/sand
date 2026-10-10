import type { AccountUsage } from '@sand/usage/contract'
import { newest } from '../limits'
import { addTotals, byCost, including } from '../totals'
import type { Account, PcSummary } from '../types'

const identityOf = ({ label, provider, billing, plan }: AccountUsage) => ({ label, provider, billing, ...(plan && { plan }) })

export const mergeAccounts = (parts: PcSummary[]): Account[] => {
  const byKey = new Map<string, Account>()
  for (const { pc, summary } of parts)
    for (const account of summary.accounts) {
      const used = account.turns ? [pc.id] : []
      const found = byKey.get(account.key)
      if (!found) {
        byKey.set(account.key, { ...account, usage: { ...account.usage }, machines: used })
        continue
      }
      addTotals(found, account)
      found.threads += account.threads
      if (account.pc === pc.id) Object.assign(found, identityOf(account))
      found.limits = newest(found.limits, account.limits)
      including(found.machines, used)
    }
  return [...byKey.values()].sort(byCost)
}
