import { gitFiles } from './git'
import { skipped, walkFiles } from './walk'

const limit = 20_000
const freshMs = 10_000

const visible = (path: string) => !path.split('/').some(part => skipped.has(part))

const listFiles = async (cwd: string) => ((await gitFiles(cwd)) ?? (await walkFiles(cwd, limit))).filter(visible).slice(0, limit)

export const cachedList = () => {
  const cache = new Map<string, { at: number; files: Promise<string[]> }>()
  return (cwd: string) => {
    const cached = cache.get(cwd)
    if (cached && Date.now() - cached.at < freshMs) return cached.files
    const files = listFiles(cwd)
    cache.set(cwd, { at: Date.now(), files })
    files.catch(() => cache.delete(cwd))
    return files
  }
}
