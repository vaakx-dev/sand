import { capital } from '@sand/kit'
import type { Kit } from '@sand/ui-kit/contract'
import type { AccountKind, LoginMethod, LoginSignIn } from '../contract'

interface Described {
  kind: AccountKind
  label: string
  method?: LoginMethod
  plan?: string
  signIn?: LoginSignIn
}

export const planName = (account: { label: string; signIn?: LoginSignIn } | undefined) => account?.signIn?.name ?? account?.label ?? ''

export const accountLogo = ({ icon, providerIcon, tile }: Kit, provider: string) => tile(providerIcon(provider, 18) ?? icon('lock', 16))

const planText = (name: string, plan?: string) => (plan ? `${name} ${capital(plan)}` : `${name} plan`)

export const howText = (account: Described) => {
  if (account.method === 'oauth') return planText(planName(account), account.plan)
  return account.kind === 'server' ? 'Server' : 'API key'
}

export const readyChip = ({ badge, dot }: Kit, online: boolean) => (online ? badge('success', dot('success'), 'Ready') : badge('neutral', dot('neutral'), 'Offline'))
