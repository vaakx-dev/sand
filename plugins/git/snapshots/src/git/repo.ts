import type { GitRunner } from '@sand/git/contract'
import { existsSync } from 'node:fs'
import { normalize, resolve, sep } from 'node:path'

export interface SnapshotRepo {
  root: string
  index: string
}

const layout = ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-path', 'index']

export const pathKey = (path: string) => (process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path))

export const isInside = (root: string, path: string) => {
  const base = pathKey(root)
  const key = pathKey(path)
  return key === base || key.startsWith(base.endsWith(sep) ? base : base + sep)
}

export const findRepo = async (git: GitRunner, cwd: string): Promise<SnapshotRepo | undefined> => {
  if (!existsSync(cwd)) return undefined
  const [top, index] = (await git.maybe(cwd, layout, { read: true }))?.split(/\r?\n/) ?? []
  return top && index ? { root: normalize(top), index: normalize(index) } : undefined
}
