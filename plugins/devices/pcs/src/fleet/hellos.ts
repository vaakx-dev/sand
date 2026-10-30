import type { Hello, HelloField, HelloValues, hello, InputOf } from '@sand/host-hub/contract'

const keptTags = 4

export const helloMemory = () => {
  const shared = new Map<string, HelloValues>()
  let tag: string | undefined
  let values: HelloValues | undefined

  const remember = (next: string, sharedValues: HelloValues) => {
    shared.delete(next)
    shared.set(next, sharedValues)
    while (shared.size > keptTags) shared.delete(shared.keys().next().value!)
  }

  return {
    greeting: (since: string | undefined): InputOf<typeof hello> => ({
      since: since ?? null,
      ...(tag && shared.has(tag) && { known: tag }),
    }),
    take(reply: Hello) {
      if (reply.shared) remember(reply.tag, reply.shared)
      const retagged = tag !== undefined && tag !== reply.tag
      tag = reply.tag
      values = { ...shared.get(reply.tag), ...reply.fresh }
      return retagged
    },
    read: <T>(field: HelloField<T>) => values?.[field.id] as T | undefined,
  }
}

export type HelloMemory = ReturnType<typeof helloMemory>
