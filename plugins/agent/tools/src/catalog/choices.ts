import { isRecord, serial } from '@sand/kit'
import { join } from 'node:path'
import type { ToolLoad } from '../contract'

const loads: ToolLoad[] = ['always', 'on-demand', 'off']

const isLoad = (value: unknown): value is ToolLoad => loads.some(load => load === value)

const clean = (data: unknown): Record<string, ToolLoad> => {
  const groups = isRecord(data) && isRecord(data.groups) ? data.groups : {}
  return Object.fromEntries(Object.entries(groups).filter((entry): entry is [string, ToolLoad] => isLoad(entry[1])))
}

export const loadChoices = async (home: string) => {
  const file = join(home, 'tools.json')
  let saved = clean(await Bun.file(file).json().catch(() => ({})))
  const queue = serial()
  return {
    get: (group: string): ToolLoad | undefined => saved[group],
    async set(group: string, load: ToolLoad) {
      saved = { ...saved, [group]: load }
      await queue(() => Bun.write(file, `${JSON.stringify({ groups: saved }, null, 2)}\n`))
    },
  }
}

export type Choices = Awaited<ReturnType<typeof loadChoices>>
