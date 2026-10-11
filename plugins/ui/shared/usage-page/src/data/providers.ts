import { providerColor } from '@sand/dom'
import { grouped } from '@sand/kit'
import type { Account } from './types'

export interface Provider {
  id: string
  accounts: Account[]
  cost: number
}

export const providersOf = (accounts: Account[]) => {
  const byId = new Map<string, Provider>()
  for (const account of accounts) {
    const provider = grouped(byId, account.provider, (): Provider => ({ id: account.provider, accounts: [], cost: 0 }))
    provider.accounts.push(account)
    provider.cost += account.cost
  }
  return [...byId.values()].sort((a, b) => b.cost - a.cost)
}

export const colorsOf = (accounts: Account[]) => {
  const order = providersOf(accounts).map(provider => provider.id)
  return (provider: string) => providerColor(provider, order.indexOf(provider))
}
