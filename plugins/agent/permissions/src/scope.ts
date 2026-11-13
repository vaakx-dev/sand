import type { ConversationRef } from '@sand/engine/contract'
import type { Orchestrator } from '@sand/orchestrator/contract'
import type { Mode, ModeState } from './contract'
import type { Stores } from './store'

export interface Scope extends ModeState {
  chain: ConversationRef[]
  home: ConversationRef
}

const MAX_DEPTH = 32

const same = (a: ConversationRef, b: ConversationRef) => a.owner === b.owner && a.id === b.id

export const createScopes = (stores: Stores, orchestrator: () => Orchestrator | undefined) => {
  const starterOf = (at: ConversationRef) => (at.owner === 'thread' ? orchestrator()?.starterOf(at.id) : undefined)

  const chainOf = (at: ConversationRef, chain: ConversationRef[] = []): ConversationRef[] => {
    if (chain.length >= MAX_DEPTH || chain.some(seen => same(seen, at))) return chain
    const next = starterOf(at)
    return next ? chainOf(next, [...chain, at]) : [...chain, at]
  }

  const explicit = (chain: ConversationRef[]) =>
    chain.flatMap(at => {
      const mode = stores.modes.get(at)
      return mode ? [{ at, mode }] : []
    })[0]

  const strictAfter = (chain: ConversationRef[]) => chain.slice(1).some(at => at.owner === 'bot')

  return (conversation: ConversationRef): Scope => {
    const chain = chainOf(conversation)
    const found = explicit(chain)
    const mode: Mode = found?.mode ?? 'off'
    const home = found?.at ?? chain.at(-1)!
    return { mode, chain, home, strict: strictAfter(chain), ...(found && !same(found.at, conversation) && { from: found.at }) }
  }
}

export type Scopes = ReturnType<typeof createScopes>
