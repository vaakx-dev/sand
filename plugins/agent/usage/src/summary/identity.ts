import type { Billing, LLM, SourceInfo } from '@sand/accounts/contract'
import type { Turn } from './turns'
import { accountKey } from '../records'
import { factsOf, unknownSource } from './labels'

export interface AccountId {
  key: string
  source: string
  label: string
  provider: string
  billing: Billing
  kind?: string
  plan?: string
  pc?: string
  pcName?: string
}

export type Known = Map<string, AccountId>

type Tagged = Omit<Turn, 'at' | 'session' | 'usage'>

const prefixOf = (model: string) => {
  const at = model.indexOf('/')
  return at > 0 ? model.slice(0, at) : undefined
}

const knownOf = ({ id, account, kind, label, provider, billing, plan, pc, via }: SourceInfo): AccountId => {
  const source = account ?? id
  return {
    key: accountKey({ source, pc }),
    source,
    label,
    provider,
    billing,
    kind,
    ...(plan && { plan }),
    ...(pc && { pc }),
    ...(via && { pcName: via }),
  }
}

export const knownAccounts = (llm?: LLM): Known => new Map((llm?.accounts?.() ?? []).map(info => [knownOf(info).key, knownOf(info)]))

export const identityResolver = (llm?: LLM, known = knownAccounts(llm)) => {
  const sourceOf = (turn: Tagged) => turn.source ?? prefixOf(turn.model) ?? llm?.find?.(turn.model)?.source ?? unknownSource

  return (turn: Tagged): AccountId => {
    const source = sourceOf(turn)
    const key = accountKey({ source, pc: turn.pc })
    const current = known.get(key)
    const facts = factsOf(source)
    const plan = turn.plan ?? current?.plan
    const pcName = turn.pcName ?? current?.pcName
    return {
      key,
      source,
      label: turn.account ?? current?.label ?? facts.label,
      provider: (turn.source && turn.provider) || current?.provider || facts.provider,
      billing: turn.billing ?? current?.billing ?? facts.billing,
      ...(current?.kind && { kind: current.kind }),
      ...(plan && { plan }),
      ...(turn.pc && { pc: turn.pc }),
      ...(pcName && { pcName }),
    }
  }
}
