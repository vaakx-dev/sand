import { join } from 'node:path'

export interface DraftManifest {
  dependencies: string[]
  loops: string[]
}

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item)) : [])

export const readManifest = async (dir: string): Promise<DraftManifest | undefined> => {
  try {
    const data = (await Bun.file(join(dir, 'package.json')).json()) as { dependencies?: unknown; sand?: { loops?: unknown } } | null
    const dependencies = data?.dependencies && typeof data.dependencies === 'object' ? Object.keys(data.dependencies) : []
    return { dependencies, loops: strings(data?.sand?.loops) }
  } catch {
    return undefined
  }
}
