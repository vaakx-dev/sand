import type { WorktreeMark } from '../contract'
import { samePath } from '@sand/kit/fs'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { gitMaybe } from '../git/run'

const freshMs = 10_000
const most = 500

const cache = new Map<string, { at: number; mark: WorktreeMark | null }>()

const read = async (cwd: string): Promise<WorktreeMark | null> => {
  if (!cwd || !existsSync(cwd)) return null
  const out = await gitMaybe(cwd, ['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir', '--abbrev-ref', 'HEAD'])
  const [dir, common, branch] = out?.split('\n').map(line => line.trim()) ?? []
  if (!dir || !common || samePath(dir, common)) return null
  return { branch: branch && branch !== 'HEAD' ? branch : null, main: resolve(dirname(common)) }
}

export const markOf = async (cwd: string) => {
  const cached = cache.get(cwd)
  if (cached && Date.now() - cached.at < freshMs) return cached.mark
  const mark = await read(cwd).catch(() => null)
  cache.set(cwd, { at: Date.now(), mark })
  return mark
}

export const forgetMarks = () => cache.clear()

export const marksOf = async (cwds: unknown) => {
  const wanted = Array.isArray(cwds) ? [...new Set(cwds.filter((cwd): cwd is string => typeof cwd === 'string'))].slice(0, most) : []
  const found = await Promise.all(wanted.map(markOf))
  return Object.fromEntries(wanted.map((cwd, index) => [cwd, found[index] ?? null]))
}
