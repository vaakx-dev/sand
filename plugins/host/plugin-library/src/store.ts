import { readState, writePrivateJson } from '@sand/util/fs'
import { join } from 'node:path'
import { z } from 'zod'

type Kept = Record<string, string>

const keptFile = z
  .object({
    kept: z
      .record(z.string(), z.unknown())
      .transform(kept => Object.fromEntries(Object.entries(kept).filter((entry): entry is [string, string] => typeof entry[1] === 'string')))
      .catch({}),
  })
  .catch({ kept: {} })

const keptOf = (data: unknown): Kept => keptFile.parse(data).kept

const readKept = async (file: string): Promise<Kept> => (await readState(file, keptOf)) ?? {}

export const keptStore = async (home: string) => {
  const file = join(home, 'plugin-library.json')
  let kept = await readKept(file)
  const save = (next: Kept) => {
    kept = next
    return writePrivateJson(file, { kept })
  }
  return {
    get: (name: string): string | undefined => kept[name],
    keep: (name: string, hash: string) => save({ ...kept, [name]: hash }),
    forget: (name: string) => {
      if (!(name in kept)) return Promise.resolve()
      const { [name]: _, ...rest } = kept
      return save(rest)
    },
  }
}

export type KeptStore = Awaited<ReturnType<typeof keptStore>>
