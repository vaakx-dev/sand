import { join } from 'node:path'
import { writePrivateJson } from '../private'

type Kept = Record<string, string>

const readKept = async (file: string): Promise<Kept> => {
  const data: unknown = await Bun.file(file).json().catch(() => undefined)
  const kept = data && typeof data === 'object' ? (data as { kept?: unknown }).kept : undefined
  if (!kept || typeof kept !== 'object') return {}
  return Object.fromEntries(Object.entries(kept).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}

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
