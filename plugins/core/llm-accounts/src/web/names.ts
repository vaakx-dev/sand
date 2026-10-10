import { badge, dot, icon, providerIcon, tile } from '@sand/dom'
import { capital } from '@sand/kit'
import type { AccountKind, SignInKind } from '../contract'
import { isSignInKind } from '../auth/kinds'

interface Described {
  kind: AccountKind
  plan?: string
}

export const planNames: Record<SignInKind, string> = { claude: 'Claude', codex: 'ChatGPT' }

export const accountLogo = (provider: string) => tile(providerIcon(provider, 18) ?? icon('lock', 16))

const planText = (kind: SignInKind, plan?: string) => (plan ? `${planNames[kind]} ${capital(plan)}` : `${planNames[kind]} plan`)

export const howText = (account: Described) => {
  if (isSignInKind(account.kind)) return planText(account.kind, account.plan)
  return account.kind === 'server' ? 'Server' : 'API key'
}

export const readyChip = (online: boolean) => (online ? badge('success', dot('success'), 'Ready') : badge('neutral', dot('neutral'), 'Offline'))
