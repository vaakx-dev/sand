import { serial } from '@sand/util'
import { writeAtomic } from '@sand/util/fs'
import { z } from 'zod'
import type { GuessesState } from './contract'

const ON_BY_DEFAULT = false

const saved = z.object({ on: z.boolean().default(ON_BY_DEFAULT) })

const read = async (file: string): Promise<GuessesState> => {
  const found = Bun.file(file)
  return saved.parse((await found.exists()) ? await found.json() : {})
}

export const createStore = async (file: string) => {
  let current = await read(file)
  const queue = serial()
  return {
    get: () => current,
    async save(next: GuessesState) {
      current = next
      await queue(() => writeAtomic(file, `${JSON.stringify(next, null, 2)}\n`))
    },
  }
}

export type Store = Awaited<ReturnType<typeof createStore>>
