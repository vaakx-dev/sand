import { serial } from '@sand/util'
import { readState, writeAtomic } from '@sand/util/fs'
import { z } from 'zod'

const saved = z.object({ declined: z.array(z.string()) })

const load = async (file: string) => new Set((await readState(file, data => saved.safeParse(data).data?.declined)) ?? [])

export const createDeclined = (file: string) => {
  let loading: Promise<Set<string>> | undefined
  const keys = () => (loading ??= load(file))
  const write = serial()
  return {
    has: async (key: string) => (await keys()).has(key),
    async add(key: string) {
      const all = await keys()
      all.add(key)
      await write(() => writeAtomic(file, JSON.stringify({ declined: [...all] }, null, 2)))
    },
  }
}
