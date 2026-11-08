import type { Draft } from '@sand/composer/contract'
import { serial } from '@sand/util'
import { z } from 'zod'
import { draft } from './contract'

const saved = z.record(z.string(), draft)

export const createStore = async (file: string) => {
  const found = Bun.file(file)
  const drafts = new Map(Object.entries(saved.parse((await found.exists()) ? await found.json() : {})))
  const queue = serial()
  return {
    read: (key: string) => drafts.get(key) ?? null,
    all: () => [...drafts.values()],
    async write(key: string, next: Draft | null) {
      if (next) drafts.set(key, next)
      else drafts.delete(key)
      await queue(() => Bun.write(file, JSON.stringify(Object.fromEntries(drafts))))
    },
  }
}
