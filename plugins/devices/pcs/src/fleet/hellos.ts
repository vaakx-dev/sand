import type { Hello, HelloField, HelloValues, hello, InputOf } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { z } from 'zod'
import { readStored, writeStored } from '../integrations/storage'

const keptTags = 4

const keptSchema = lazy(() => z.object({ tag: z.string(), shared: z.record(z.string(), z.unknown()) }))

export const helloMemory = (pc: string) => {
  const key = `sand-hello-${pc}`
  const shared = new Map<string, HelloValues>()
  const kept = keptSchema().safeParse(readStored(key)).data
  let tag: string | undefined
  let taken: string | undefined
  let values: HelloValues | undefined
  if (kept) {
    shared.set(kept.tag, kept.shared)
    tag = kept.tag
  }

  const remember = (next: string, sharedValues: HelloValues) => {
    shared.delete(next)
    shared.set(next, sharedValues)
    while (shared.size > keptTags) shared.delete(shared.keys().next().value!)
    writeStored(key, { tag: next, shared: sharedValues })
  }

  return {
    greeting: (since: string | undefined): InputOf<typeof hello> => ({
      since: since ?? null,
      ...(tag && shared.has(tag) && { known: tag }),
    }),
    take(reply: Hello) {
      if (reply.shared) remember(reply.tag, reply.shared)
      const retagged = taken !== undefined && taken !== reply.tag
      taken = reply.tag
      tag = reply.tag
      values = { ...shared.get(reply.tag), ...reply.fresh }
      return retagged
    },
    read: <T>(field: HelloField<T>) => values?.[field.id] as T | undefined,
  }
}

export type HelloMemory = ReturnType<typeof helloMemory>
