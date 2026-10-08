import type { Context } from 'drydock'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const startsAtHome = (path: string) => path === '~' || path.startsWith('~/') || path.startsWith('~\\')

export const expandHome = (path: string, base?: string) => {
  const expanded = startsAtHome(path) ? join(homedir(), path.slice(1)) : path
  return base ? resolve(base, expanded) : resolve(expanded)
}

export const sandHome = (ctx?: Context) => ctx?.cli?.home ?? (process.env.SAND_HOME ? expandHome(process.env.SAND_HOME) : join(homedir(), '.sand'))

export const workingFolder = (ctx?: Context) => ctx?.cli?.cwd ?? process.cwd()
