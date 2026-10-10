import type { LLM, SourceRef } from '@sand/llm-accounts/contract'
import type { Usage } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { UsageRecord } from '../contract'
import type { TurnState } from './state'
import { accountKey, tokensOf, usageSource } from '@sand/kit'

export const empty = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })

export const add = (a: Usage, b: Usage): Usage => ({
  input: a.input + b.input,
  output: a.output + b.output,
  cacheRead: a.cacheRead + b.cacheRead,
  cacheWrite: a.cacheWrite + b.cacheWrite,
})

export const track = (state: TurnState, usage: Usage, model?: string, source?: SourceRef) => {
  state.usage = add(state.usage, usage)
  const key = `${model ?? ''}\n${source ? accountKey(source) : ''}`
  const group = state.sources.get(key)
  state.sources.set(key, { ...(model && { model }), ...(source && { source }), usage: add(group?.usage ?? empty(), usage) })
}

export const record = (session: Session, state: TurnState, llm: LLM | undefined) => {
  for (const { model, source, usage } of state.sources.values()) {
    if (!tokensOf(usage)) continue
    const data: UsageRecord = { id: Bun.randomUUIDv7(), ...(model && { model }), ...usageSource(llm, model, source), usage }
    session.append('usage', data)
  }
}
