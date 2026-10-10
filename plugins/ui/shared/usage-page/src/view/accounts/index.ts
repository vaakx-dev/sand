import { div, exactTime, providerIcon, secondaryAction, span, type Sig } from '@sand/dom'
import { colorsOf, providersOf, type Provider } from '../../data/providers'
import type { Account } from '../../data/types'
import { agoText } from '../../format'
import { isSubscription, providerName } from '../../names'
import { block, heading, spacer } from '../parts'
import { keyCard, subscriptionCard, type CardProps } from './cards'

interface AccountsProps {
  now: Sig<number>
  nameOf(id: string): string
  checking: Sig<boolean>
  check?: () => void
}

const checkedAt = (accounts: Account[]) => Math.max(0, ...accounts.map(account => account.limits?.updated ?? 0))

const checkedText = (updated: number, now: Sig<number>) =>
  span({ class: 'text-xs text-neutral-500 tabular-nums', title: `Checked ${exactTime(updated)}` }, () => {
    now.get()
    return `Limits checked ${agoText(updated)}`
  })

const limitsCheck = (accounts: Account[], props: AccountsProps) => {
  const updated = checkedAt(accounts)
  const checkable = props.check && accounts.some(isSubscription)
  return [
    updated ? checkedText(updated, props.now) : null,
    checkable ? secondaryAction({ size: 'sm', onClick: props.check, disabled: props.checking }, 'Check') : null,
  ]
}

const providerSection = (provider: Provider, props: CardProps & AccountsProps) =>
  block(
    [heading(providerIcon(provider.id, 16), providerName(provider.id)), spacer(), ...limitsCheck(provider.accounts, props)],
    provider.accounts.map(account => (isSubscription(account) ? subscriptionCard(account, props) : keyCard(account, props))),
  )

export const accountsView = (accounts: Account[], props: AccountsProps) => {
  const colorOf = colorsOf(accounts)
  return accounts.length
    ? div({ class: 'flex flex-col gap-8' }, providersOf(accounts).map(provider => providerSection(provider, { ...props, colorOf })))
    : span()
}
