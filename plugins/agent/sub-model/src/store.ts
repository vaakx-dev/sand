import { serial } from '@sand/util'
import { z } from 'zod'
import { chosenModel, tiers } from './contract'

const saved = z.object({
  models: z.partialRecord(z.enum(tiers), chosenModel).default({}),
})

export type Saved = z.output<typeof saved>

const read = async (file: string): Promise<Saved> => {
  const found = Bun.file(file)
  return saved.parse((await found.exists()) ? await found.json() : {})
}

export const put = <R, K extends keyof R>(record: R, key: K, value: R[K] | null): R => {
  const next = { ...record }
  if (value === null) delete next[key]
  else next[key] = value
  return next
}

export const createStore = async (file: string) => {
  let current = await read(file)
  const queue = serial()
  return {
    get: () => current,
    async save(next: Saved) {
      current = next
      await queue(() => Bun.write(file, `${JSON.stringify(next, null, 2)}\n`))
    },
  }
}

export type Store = Awaited<ReturnType<typeof createStore>>
