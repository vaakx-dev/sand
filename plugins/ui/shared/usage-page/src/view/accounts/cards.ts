import type { Sig } from '@sand/dom'
import { dollars, tokens, tokensOf } from '@sand/kit'
import type { Account } from '../../data/types'
import { isLocal, listText } from '../../names'
import { card, stat, stats } from '../parts'
import { gauge } from './gauge'

type NameOf = (id: string) => string

export interface CardProps {
  now: Sig<number>
  nameOf: NameOf
  colorOf(provider: string): string
}

const metaText = (parts: string[]) => parts.filter(Boolean).join(' · ')

const homeName = (account: Account) => account.pcName ?? 'this PC'

const usedOnText = (account: Account, nameOf: NameOf) => {
  const others = account.machines.filter(id => id !== account.pc).map(nameOf)
  return others.length ? `used on ${listText(others)}` : ''
}

const subscriptionMeta = (account: Account, nameOf: NameOf) =>
  metaText([
    account.plan ? `${account.plan} plan` : 'subscription',
    `on ${homeName(account)}`,
    usedOnText(account, nameOf),
    account.limits?.windows.length ? '' : 'no limits reported',
  ])

const keyMeta = (account: Account, nameOf: NameOf) => {
  if (isLocal(account)) return metaText([`runs on ${homeName(account)}`, usedOnText(account, nameOf)])
  const names = account.machines.map(nameOf)
  return `on ${names.length ? listText(names) : homeName(account)}`
}

const valueNote = (account: Account) => (!account.turns || account.unpriced === account.turns ? undefined : `≈${dollars(account.cost)} at API prices`)

const gauges = (account: Account, { now, colorOf }: CardProps) => (account.limits?.windows ?? []).map(window => gauge(window, colorOf(account.provider), now))

const spentStat = (account: Account) => (isLocal(account) ? null : stat(account.billing === 'credits' ? 'Credits' : 'Billed', dollars(account.billed)))

export const subscriptionCard = (account: Account, props: CardProps) =>
  card(account.label, subscriptionMeta(account, props.nameOf), stats(gauges(account, props), stat('Used', `${tokens(tokensOf(account.usage))} tokens`, valueNote(account))))

export const keyCard = (account: Account, props: CardProps) =>
  card(account.label, keyMeta(account, props.nameOf), stats(gauges(account, props), spentStat(account), stat('Tokens', tokens(tokensOf(account.usage)))))
