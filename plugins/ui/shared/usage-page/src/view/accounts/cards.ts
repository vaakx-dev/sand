import type { Sig } from '@sand/dom'
import { dollars, tokens, tokensOf } from '@sand/kit'
import type { Account } from '../../data/types'
import { isLocal, listText } from '../../names'
import { card, stat, stats } from '../parts'
import { gauge } from './gauge'

export interface CardProps {
  now: Sig<number>
  nameOf(id: string): string
  colorOf(provider: string): string
}

const usedOn = (account: Account, nameOf: (id: string) => string) => account.machines.filter(id => id !== account.pc).map(nameOf)

const subscriptionMeta = (account: Account, nameOf: (id: string) => string) => {
  const others = usedOn(account, nameOf)
  return [
    account.plan ? `${account.plan} plan` : 'subscription',
    `on ${account.pcName ?? 'this PC'}`,
    others.length ? `used on ${listText(others)}` : '',
    account.limits?.windows.length ? '' : 'no limits reported',
  ]
    .filter(Boolean)
    .join(' · ')
}

const valueNote = (account: Account) => (!account.turns || account.unpriced === account.turns ? undefined : `≈${dollars(account.cost)} at API prices`)

const gauges = (account: Account, { now, colorOf }: CardProps) => (account.limits?.windows ?? []).map(window => gauge(window, colorOf(account.provider), now))

export const subscriptionCard = (account: Account, props: CardProps) =>
  card(account.label, subscriptionMeta(account, props.nameOf), stats(gauges(account, props), stat('Used', `${tokens(tokensOf(account.usage))} tokens`, valueNote(account))))

const serverMeta = (account: Account, nameOf: (id: string) => string) => {
  const others = usedOn(account, nameOf)
  return [`runs on ${account.pcName ?? 'this PC'}`, others.length ? `used on ${listText(others)}` : ''].filter(Boolean).join(' · ')
}

const keyMeta = (account: Account, nameOf: (id: string) => string) => {
  if (isLocal(account)) return serverMeta(account, nameOf)
  const names = account.machines.map(nameOf)
  return `on ${names.length ? listText(names) : (account.pcName ?? 'this PC')}`
}

const spentStat = (account: Account) => (isLocal(account) ? null : stat(account.billing === 'credits' ? 'Credits' : 'Billed', dollars(account.billed)))

export const keyCard = (account: Account, props: CardProps) =>
  card(account.label, keyMeta(account, props.nameOf), stats(gauges(account, props), spentStat(account), stat('Tokens', tokens(tokensOf(account.usage)))))
