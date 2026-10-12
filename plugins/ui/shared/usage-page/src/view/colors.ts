import type { Kit } from '@sand/ui-kit/contract'
import { providersOf } from '../data/providers'
import type { Account } from '../data/types'

export const colorsOf = (kit: Kit, accounts: Account[]) => {
  const { providerColor } = kit
  const order = providersOf(accounts).map(provider => provider.id)
  return (provider: string) => providerColor(provider, order.indexOf(provider))
}
