import type { LLM, SourceRef } from '@sand/llm-accounts/contract'
import type { Usage } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { UsageRecord } from '../contract'
import type { TurnState } from './state'
import { accountKey, emptyUsage, sumUsage, tokensOf, usageSource } from '@sand/kit'

export const track = (state: TurnState, usage: Usage, model?: string, source?: SourceRef) => {
  state.usage = sumUsage(state.usage, usage)
  const key = `${model ?? ''}\n${source ? accountKey(source) : ''}`
  const group = state.sources.get(key)
  state.sources.set(key, { ...(model && { model }), ...(source && { source }), usage: sumUsage(group?.usage ?? emptyUsage(), usage) })
}

export const record = (session: Session, state: TurnState, llm: LLM) => {
  for (const { model, source, usage } of state.sources.values()) {
    if (!tokensOf(usage)) continue
    const data: UsageRecord = { id: Bun.randomUUIDv7(), ...(model && { model }), ...usageSource(llm.provider?.(model), source), usage }
    session.append('usage', data)
  }
}
