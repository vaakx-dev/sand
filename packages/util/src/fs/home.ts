import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const startsAtHome = (path: string) => path === '~' || path.startsWith('~/') || path.startsWith('~\\')

export const expandHome = (path: string, base?: string) => {
  const expanded = startsAtHome(path) ? join(homedir(), path.slice(1)) : path
  return base ? resolve(base, expanded) : resolve(expanded)
}
