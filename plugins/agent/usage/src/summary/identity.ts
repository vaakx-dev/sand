import type { Billing, LLM } from '@sand/llm-accounts/contract'
import type { Turn } from './turns'
import { accountKey } from '@sand/kit'
import { factsOf, unknownSource } from './labels'

export interface AccountId {
  key: string
  source: string
  label: string
  provider: string
  billing: Billing
  plan?: string
  pc?: string
  pcName?: string
}

const familyOf = (model: string) => (/claude/.test(model) ? 'anthropic' : /^(gpt-|codex|o\d)/.test(model) ? 'openai' : undefined)

const prefixOf = (model: string) => {
  const at = model.indexOf('/')
  return at > 0 ? model.slice(0, at) : undefined
}

const guessed = (turn: Turn) => {
  const family = familyOf(turn.model)
  if (!family || !turn.billing) return undefined
  const plan = turn.billing === 'plan'
  if (family === 'anthropic') return plan ? 'claude' : 'anthropic'
  return plan ? 'codex' : 'openai'
}

export const identityResolver = (llm?: LLM) => {
  const sources = new Map((llm?.sources?.() ?? []).map(found => [found.id, found]))
  const sourceOf = (turn: Turn) => turn.source ?? prefixOf(turn.model) ?? guessed(turn) ?? llm?.find?.(turn.model)?.source ?? unknownSource

  return (turn: Turn): AccountId => {
    const source = sourceOf(turn)
    const current = turn.pc ? undefined : sources.get(source)
    const facts = factsOf(source)
    const plan = turn.plan ?? current?.plan
    return {
      key: accountKey({ source, pc: turn.pc }),
      source,
      label: turn.account ?? current?.label ?? facts.label,
      provider: (turn.source && turn.provider) || current?.provider || facts.provider,
      billing: turn.billing ?? current?.billing ?? facts.billing,
      ...(plan && { plan }),
      ...(turn.pc && { pc: turn.pc }),
      ...(turn.pcName && { pcName: turn.pcName }),
    }
  }
}
