import { sessions } from '@sand/chats/contract'
import { type Hello, type HelloField, type HelloValues, helloActive, type InputOf, type hello } from '@sand/host-hub/contract'
import { turnEnd, turnStart } from '@sand/turns-contract/contract'
import { errorMessage } from '@sand/util'
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

  const threads = (since: string | null): HelloValues => {
    const synced = ctx.get(sessions)?.synced(since, [...active.keys()])
    return synced ? { [helloSessions.id]: synced.sessions, [helloSync.id]: synced.sync, [helloDelta.id]: synced.delta } : {}
  }

  const own = (since: string | null): HelloValues => ({
    ...threads(since),
    [helloActive.id]: [...active.keys()],
    [helloStarted.id]: Object.fromEntries(active),
  })

  const failed = new WeakSet<Field>()

  const leaveOut = (id: string, field: Field, why: string) => {
    if (!failed.has(field)) ctx.report(new Error(`The hello field ${id} was left out: ${why}`))
    failed.add(field)
    return undefined
  }

  const read = (id: string, field: Field) => {
    try {
      const value: unknown = field.value()
      if (!(value instanceof Promise)) return value
      void value.catch(() => {})
      return leaveOut(id, field, 'it returned a promise, and a hello value has to be ready at once')
    } catch (error) {
      return leaveOut(id, field, errorMessage(error))
    }
  }

  const answer = ({ since, known }: InputOf<typeof hello>): Hello => {
    const fresh = own(since)
    const shared: HelloValues = {}
    for (const [id, field] of fields) {
      const value = read(id, field)
      if (value !== undefined) (field.fresh ? fresh : shared)[id] = value
    }
    const tag = Bun.hash(JSON.stringify(shared)).toString(36)
    return known === tag ? { tag, fresh } : { tag, fresh, shared }
  }

  return { register, answer }
}
