import { providersOf, type Provider } from '../../data/providers'
import { colorsOf } from '../colors'
import type { Account } from '../../data/types'
import { isSubscription } from '../../names'
import { limitCard, type CardProps } from './card'

export type LimitsProps = Omit<CardProps, 'colorOf'>

const providerSection = (provider: Provider, props: CardProps) =>
  props.kit.settingsSection(
    {},
    provider.accounts.map(account => limitCard(account, props)),
  )

const hasLimits = (account: Account) => isSubscription(account) || Boolean(account.limits?.windows.length)

export const limitsView = (accounts: Account[], props: LimitsProps) => {
  const { emptyState, settingsSection } = props.kit
  const planned = accounts.filter(hasLimits)
  if (!planned.length) return settingsSection({}, emptyState({ surface: 'group', text: 'None of your accounts report plan limits' }))
  const colorOf = colorsOf(props.kit, accounts)
  return providersOf(planned).map(provider => providerSection(provider, { ...props, colorOf }))
}
