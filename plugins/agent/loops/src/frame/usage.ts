import type { LLM, SourceRef } from '@sand/llm-accounts/contract'
import type { Usage } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { TurnState } from './state'
import { accountKey, emptyUsage, sumUsage, tokensOf, usageRecord } from '@sand/kit'

export const track = (state: TurnState, usage: Usage, model?: string, source?: SourceRef) => {
  state.usage = sumUsage(state.usage, usage)
  const key = `${model ?? ''}\n${source ? accountKey(source) : ''}`
  const group = state.sources.get(key)
  state.sources.set(key, { ...(model && { model }), ...(source && { source }), usage: sumUsage(group?.usage ?? emptyUsage(), usage) })
}

export const record = (session: Session, state: TurnState, llm: LLM) => {
  for (const { model, source, usage } of state.sources.values()) {
    if (tokensOf(usage)) session.append('usage', usageRecord(llm.provider?.(model), model, usage, source))
  }
}
