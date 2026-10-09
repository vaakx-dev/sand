import { badge, dot, icon, providerIcon, tile } from '@sand/dom'
import type { LoginMethod } from '@sand/protocol'

interface Named {
  provider: string
  label: string
  subscription: string
  method?: LoginMethod
  plan?: string
}

export const accountLogo = (provider: string) => tile(providerIcon(provider, 18) ?? icon('lock', 16))

export const accountTitle = (account: Named) => (account.method === 'api_key' ? account.label : account.subscription)

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export const howText = (account: Named) => (account.method === 'api_key' ? 'API key' : account.plan ? `${capital(account.plan)} subscription` : 'Subscription')

export const readyChip = (online: boolean) => (online ? badge('success', dot('success'), 'Ready') : badge('neutral', dot('neutral'), 'Offline'))
