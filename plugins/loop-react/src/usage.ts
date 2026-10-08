import type { Session, Usage, UsageRecord } from '@sand/protocol'
import { tokensOf } from '@sand/kit'

export const empty = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })

export const add = (a: Usage, b: Usage): Usage => ({
  input: a.input + b.input,
  output: a.output + b.output,
  cacheRead: a.cacheRead + b.cacheRead,
  cacheWrite: a.cacheWrite + b.cacheWrite,
})

export const record = (session: Session, usage: Usage, model?: string) => {
  if (!tokensOf(usage)) return
  const data: UsageRecord = { id: Bun.randomUUIDv7(), ...(model && { model }), usage }
  session.append('usage', data)
}
