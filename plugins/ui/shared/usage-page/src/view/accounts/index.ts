import { exactTime } from '@sand/util'
import { span, type Sig } from '@vaakx-dev/vrui'
import { providersOf, type Provider } from '../../data/providers'
import { colorsOf } from '../colors'
import type { Account } from '../../data/types'
import { agoText } from '../../format'
import { isSubscription, providerName } from '../../names'
import { sectionActions, sectionTitle } from '../parts'
import { limitCard, type CardProps } from './card'

export interface LimitsProps extends Omit<CardProps, 'colorOf'> {
  checking: Sig<boolean>
  check(): void
}

const checkedAt = (accounts: Account[]) => Math.max(0, ...accounts.map(account => account.limits?.updated ?? 0))

const checkedText = (updated: number, props: LimitsProps) =>
  span({ class: 'text-xs text-neutral-500 tabular-nums', title: updated ? `Checked ${exactTime(updated)}` : undefined }, () => {
    props.now.get()
    if (props.checking.get()) return 'Checking…'
    return updated ? `Limits checked ${agoText(updated)}` : ''
  })

const providerSection = (provider: Provider, props: CardProps & LimitsProps) => {
  const { providerIcon, secondaryAction, settingsSection } = props.kit
  return settingsSection(
    {
      title: sectionTitle(providerIcon(provider.id, 14), providerName(provider.id)),
      action: sectionActions(checkedText(checkedAt(provider.accounts), props), secondaryAction({ size: 'sm', onClick: props.check, disabled: props.checking }, 'Check now')),
    },
    provider.accounts.map(account => limitCard(account, props)),
  )
}

const hasLimits = (account: Account) => isSubscription(account) || Boolean(account.limits?.windows.length)

export const limitsView = (accounts: Account[], props: LimitsProps) => {
  const { hintRow, settingsSection } = props.kit
  const planned = accounts.filter(hasLimits)
  if (!planned.length) return settingsSection({}, hintRow('None of your accounts report plan limits'))
  const colorOf = colorsOf(props.kit, accounts)
  return providersOf(planned).map(provider => providerSection(provider, { ...props, colorOf }))
}
