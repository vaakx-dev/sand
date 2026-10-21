import { type Hello, type HelloField, type HelloValues, helloActive, type InputOf, type hello } from '@sand/host-hub/contract'
import { turnEnd, turnStart } from '@sand/loop/contract'
import { helloDelta, helloSessions, helloStarted, helloSync } from '../contract/hello'
import type { HelloOptions, HelloValue } from '../contract/server'
import type { ServerContext } from '../context'

interface Field {
  value: HelloValue<unknown>
  fresh: boolean
}

export const createHello = (ctx: ServerContext) => {
  const fields = new Map<string, Field>()
  const active = new Map<string, number>()
  ctx.on(turnStart, session => void active.set(session.id, Date.now()))
  ctx.on(turnEnd, session => void active.delete(session.id))

  const register = <T>(field: HelloField<T>, value: HelloValue<T>, options?: HelloOptions) => {
    const entry: Field = { value, fresh: !!options?.fresh }
    fields.set(field.id, entry)
    return () => {
      if (fields.get(field.id) === entry) fields.delete(field.id)
    }
  }

  const own = (since: string | null): HelloValues => {
    const { sessions, sync, delta } = ctx.sessions.synced(since, [...active.keys()])
    return {
      [helloSessions.id]: sessions,
      [helloSync.id]: sync,
      [helloDelta.id]: delta,
      [helloActive.id]: [...active.keys()],
      [helloStarted.id]: Object.fromEntries(active),
    }
  }

  const answer = async ({ since, known }: InputOf<typeof hello>): Promise<Hello> => {
    const fresh = own(since)
    const shared: HelloValues = {}
    const values = await Promise.all([...fields].map(async ([id, field]) => [id, field, await field.value()] as const))
    for (const [id, field, value] of values) if (value !== undefined) (field.fresh ? fresh : shared)[id] = value
    const tag = Bun.hash(JSON.stringify(shared)).toString(36)
    return known === tag ? { tag, fresh } : { tag, fresh, shared }
  }

  return { register, answer }
}
