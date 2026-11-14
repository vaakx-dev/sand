import type { Hello, HelloField, HelloValues, hello, InputOf } from '@sand/host-hub/contract'
import { isRecord } from '@sand/util'
import { readStored, writeStored } from '../integrations/storage'

const keptTags = 4

interface Kept {
  tag: string
  shared: HelloValues
}

const isKept = (value: unknown): value is Kept => isRecord(value) && typeof value.tag === 'string' && isRecord(value.shared)

export const helloMemory = (pc: string) => {
  const key = `sand-hello-${pc}`
  const shared = new Map<string, HelloValues>()
  const kept = readStored(key)
  let tag: string | undefined
  let taken: string | undefined
  let values: HelloValues | undefined
  if (isKept(kept)) {
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
