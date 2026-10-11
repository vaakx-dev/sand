import { isRecord, serial } from '@sand/kit'
import { join } from 'node:path'

export const fallbackLoop = 'react'

const readSaved = async (file: string) => {
  try {
    const data: unknown = await Bun.file(file).json()
    const saved = isRecord(data) ? data.default : undefined
    return typeof saved === 'string' && saved ? saved : undefined
  } catch {
    return undefined
  }
}

export const createDefaults = async (home: string, configured?: string) => {
  const file = join(home, 'loops.json')
  let saved = await readSaved(file)
  const queue = serial()
  return {
    get: () => configured ?? saved ?? fallbackLoop,
    async set(name: string) {
      saved = name
      await queue(() => Bun.write(file, `${JSON.stringify({ default: name }, null, 2)}\n`))
    },
  }
}

export type Defaults = Awaited<ReturnType<typeof createDefaults>>
