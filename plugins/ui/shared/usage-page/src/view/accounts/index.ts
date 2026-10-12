import { exactTime, providerIcon, secondaryAction, settingsSection, span, type Sig } from '@sand/dom'
import { colorsOf, providersOf, type Provider } from '../../data/providers'
import type { Account } from '../../data/types'
import { agoText } from '../../format'
import { isSubscription, providerName } from '../../names'
import { sectionActions, sectionTitle } from '../parts'
import { keyCard, subscriptionCard, type CardProps } from './cards'

interface AccountsProps {
  now: Sig<number>
  nameOf(id: string): string
  checking: Sig<boolean>
  check(): void
}

const checkedAt = (accounts: Account[]) => Math.max(0, ...accounts.map(account => account.limits?.updated ?? 0))

const checkedText = (updated: number, now: Sig<number>) =>
  span({ class: 'text-xs text-neutral-500 tabular-nums', title: `Checked ${exactTime(updated)}` }, () => {
    now.get()
    return `Limits checked ${agoText(updated)}`
  })

const limitsCheck = (accounts: Account[], props: AccountsProps) => {
  const updated = checkedAt(accounts)
  return [
    updated ? checkedText(updated, props.now) : null,
    accounts.some(isSubscription) ? secondaryAction({ size: 'sm', onClick: props.check, disabled: props.checking }, 'Check now') : null,
  ]
}

const providerSection = (provider: Provider, props: CardProps & AccountsProps) =>
  settingsSection(
    { title: sectionTitle(providerIcon(provider.id, 14), providerName(provider.id)), action: sectionActions(...limitsCheck(provider.accounts, props)) },
    provider.accounts.map(account => (isSubscription(account) ? subscriptionCard(account, props) : keyCard(account, props))),
  )

export const accountsView = (accounts: Account[], props: AccountsProps) => {
  if (!accounts.length) return null
  const colorOf = colorsOf(accounts)
  return providersOf(accounts).map(provider => providerSection(provider, { ...props, colorOf }))
}
