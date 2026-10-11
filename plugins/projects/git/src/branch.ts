import { uniqueStrings } from '@sand/kit'
import { gitMaybe } from '@sand/kit/git'
import { existsSync } from 'node:fs'

const freshMs = 5000
const most = 500

const cache = new Map<string, { at: number; branch?: string }>()

const read = async (cwd: string) => (await gitMaybe(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])) || undefined

const branch = async (cwd: string) => {
  if (!cwd || !existsSync(cwd)) return undefined
  const cached = cache.get(cwd)
  if (cached && Date.now() - cached.at < freshMs) return cached.branch
  const found = await read(cwd).catch(() => undefined)
  cache.set(cwd, { at: Date.now(), branch: found })
  return found
}

export const branches = async (cwds: unknown) => {
  const wanted = uniqueStrings(cwds, most)
  const found = await Promise.all(wanted.map(branch))
  return Object.fromEntries(wanted.map((cwd, index) => [cwd, found[index] ?? null]))
}
