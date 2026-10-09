import { join } from 'node:path'

export const fallbackLoop = 'react'

const readSaved = async (file: string) => {
  try {
    const data: unknown = await Bun.file(file).json()
    const saved = (data as { default?: unknown } | null)?.default
    return typeof saved === 'string' && saved ? saved : undefined
  } catch {
    return undefined
  }
}

export const createDefaults = async (home: string, configured?: string) => {
  const file = join(home, 'loops.json')
  let saved = await readSaved(file)
  let writing = Promise.resolve()
  return {
    get: () => configured ?? saved ?? fallbackLoop,
    async set(name: string) {
      saved = name
      writing = writing.then(() => Bun.write(file, `${JSON.stringify({ default: name }, null, 2)}\n`).then(() => undefined))
      await writing
    },
  }
}

export type Defaults = Awaited<ReturnType<typeof createDefaults>>
