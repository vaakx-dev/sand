import { providersOf } from '../../data/providers'
import { colorsOf } from '../colors'
import type { Account } from '../../data/types'
import { isSubscription } from '../../names'
import { limitCard, type CardProps } from './card'

export type LimitsProps = Omit<CardProps, 'colorOf'>

const hasLimits = (account: Account) => isSubscription(account) || Boolean(account.limits?.windows.length)

export const limitsView = (accounts: Account[], props: LimitsProps) => {
  const { emptyState, settingsSection } = props.kit
  const planned = accounts.filter(hasLimits)
  if (!planned.length) return emptyState({ text: 'No plan limits reported.' })
  const colorOf = colorsOf(props.kit, accounts)
  return settingsSection({}, ...providersOf(planned).flatMap(provider => provider.accounts.map(account => limitCard(account, { ...props, colorOf }))))
}
