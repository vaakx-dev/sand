import { sig, untrack } from '@vaakx-dev/vrui'

export const keyedFacts = <K, T>(keyOf: (input: K) => string, load: (input: K) => Promise<T>) => {
  const facts = sig<ReadonlyMap<string, T>>(new Map())
  const asked = new Map<string, K>()

  const keep = (key: string, value: T | undefined) =>
    facts.update(current => {
      const next = new Map(current)
      if (value === undefined) next.delete(key)
      else next.set(key, value)
      return next
    })

  const fetch = (input: K) => {
    const key = keyOf(input)
    asked.set(key, input)
    void load(input).then(
      value => keep(key, value),
      () => keep(key, undefined),
    )
  }

  return {
    get(input: K) {
      const key = keyOf(input)
      if (!asked.has(key)) untrack(() => fetch(input))
      return facts.get().get(key)
    },
    fetch,
    patch(key: string, change: (value: T) => T) {
      const found = facts.get().get(key)
      if (found !== undefined) keep(key, change(found))
    },
    refetch(test: (input: K) => boolean) {
      for (const input of asked.values()) if (test(input)) fetch(input)
    },
  }
}
