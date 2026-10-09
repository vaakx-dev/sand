import { existsSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, parse, resolve } from 'node:path'

const isProjectRoot = (dir: string) => existsSync(join(dir, '.sand')) || existsSync(join(dir, '.git'))

const comparable = (path: string) => (process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path))

export const samePath = (a: string, b: string) => comparable(a) === comparable(b)

export const isQuietFolder = (path: string) =>
  [homedir(), tmpdir(), parse(homedir()).root].some(folder => samePath(folder, path))

export const nearestRoot = (cwd: string, stop = homedir()): string | undefined => {
  const end = resolve(stop)
  for (let dir = resolve(cwd); !samePath(dir, end) && dirname(dir) !== dir; dir = dirname(dir)) {
    if (isProjectRoot(dir)) return dir
  }
  return undefined
}
