import { serial } from '@sand/util'
import { readState, writeAtomic } from '@sand/util/fs'
import { join } from 'node:path'
import { z } from 'zod'
import type { ToolLoad } from '../contract'

const loads: ToolLoad[] = ['always', 'on-demand', 'off']

const isLoad = (value: unknown): value is ToolLoad => loads.some(load => load === value)

const saved = z.object({ groups: z.record(z.string(), z.unknown()) })

const clean = (data: unknown): Record<string, ToolLoad> => {
  const groups = saved.safeParse(data).data?.groups ?? {}
  return Object.fromEntries(Object.entries(groups).filter((entry): entry is [string, ToolLoad] => isLoad(entry[1])))
}

export const loadChoices = async (home: string) => {
  const file = join(home, 'tools.json')
  let saved = (await readState(file, clean)) ?? {}
  const queue = serial()
  return {
    get: (group: string): ToolLoad | undefined => saved[group],
    async set(group: string, load: ToolLoad) {
      saved = { ...saved, [group]: load }
      await queue(() => writeAtomic(file, `${JSON.stringify({ groups: saved }, null, 2)}\n`))
    },
  }
}

export type Choices = Awaited<ReturnType<typeof loadChoices>>
