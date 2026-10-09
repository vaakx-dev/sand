import type { LLM } from '@sand/llm-accounts/contract'
import type { Usage } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { UsageRecord } from '../contract'
import { tokensOf, usageSource } from '@sand/kit'

export const empty = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })

export const add = (a: Usage, b: Usage): Usage => ({
  input: a.input + b.input,
  output: a.output + b.output,
  cacheRead: a.cacheRead + b.cacheRead,
  cacheWrite: a.cacheWrite + b.cacheWrite,
})

export const record = (session: Session, usage: Usage, model: string | undefined, llm: LLM | undefined) => {
  if (!tokensOf(usage)) return
  const data: UsageRecord = { id: Bun.randomUUIDv7(), ...(model && { model }), ...usageSource(llm, model), usage }
  session.append('usage', data)
}
