import type { Draft } from '@sand/composer/contract'
import { serial } from '@sand/util'
import { readState, writeAtomic } from '@sand/util/fs'
import { z } from 'zod'
import { draft } from './contract'

const saved = z.record(z.string(), draft)

const load = async (file: string) => (await readState(file, data => saved.safeParse(data).data)) ?? {}

export const createStore = async (file: string) => {
  const drafts = new Map(Object.entries(await load(file)))
  const queue = serial()
  return {
    read: (key: string) => drafts.get(key) ?? null,
    all: () => [...drafts.values()],
    async write(key: string, next: Draft | null) {
      if (next) drafts.set(key, next)
      else drafts.delete(key)
      await queue(() => writeAtomic(file, JSON.stringify(Object.fromEntries(drafts))))
    },
  }
}
