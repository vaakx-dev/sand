import { capital } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'
import type { AccountKind, LoginApp, LoginMethod, LoginSignIn } from '../contract'

interface Described {
  kind: AccountKind
  label: string
  method?: LoginMethod
  plan?: string
  signIn?: LoginSignIn
  app?: LoginApp
}

export const planName = (account: { label: string; signIn?: LoginSignIn } | undefined) => account?.signIn?.name ?? account?.label ?? ''

export const accountLogo = ({ icon, providerIcon }: Kit, provider: string) => providerIcon(provider, 16) ?? icon('lock')

const planText = (name: string, plan?: string) => (plan ? `${name} ${capital(plan)}` : `${name} plan`)

export const howText = (account: Described) => {
  if (account.method === 'oauth') return planText(planName(account), account.plan)
  if (account.method === 'app') return `${planText(planName(account), account.plan)} · from the ${account.app?.name ?? account.label} app`
  return account.kind === 'server' ? 'Server' : 'API key'
}

export const removeLabel = (account: { kind: AccountKind; app?: LoginApp }) => {
  if (account.app) return `Sign out of ${account.app.name}`
  return account.kind === 'server' ? 'Remove' : 'Sign out'
}

export const presence = ({ dot }: Kit, online: boolean) =>
  span({ class: 'flex items-center gap-2 text-xs text-neutral-400' }, dot(online ? 'success' : 'neutral'), online ? 'Ready' : 'Offline')
