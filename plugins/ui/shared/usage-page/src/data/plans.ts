import type { LimitWindow } from '@sand/accounts/contract'
import { grouped } from '@sand/util'
import type { Account } from './types'

export interface Share {
  account: Account
  window: LimitWindow
}

export interface WindowRow {
  id: string
  label: string
  shares: Share[]
}

export interface Plan {
  source: string
  label: string
  provider: string
  accounts: Account[]
  rows: WindowRow[]
}

const planned = (account: Account) => (account.limits?.windows.length ?? 0) > 0

const rowsOf = (accounts: Account[]) => {
  const rows = new Map<string, WindowRow>()
  for (const account of accounts)
    for (const window of account.limits?.windows ?? []) grouped(rows, window.id, () => ({ id: window.id, label: window.label, shares: [] })).shares.push({ account, window })
  return [...rows.values()]
}

export const plansOf = (accounts: Account[]): Plan[] => {
  const bySource = new Map<string, Plan>()
  for (const account of accounts.filter(planned)) {
    const { source, label, provider } = account
    grouped(bySource, source, (): Plan => ({ source, label, provider, accounts: [], rows: [] })).accounts.push(account)
  }
  return [...bySource.values()].map(plan => ({ ...plan, rows: rowsOf(plan.accounts) }))
}

export const accountName = (account: Account) => account.pcName ?? 'This PC'
