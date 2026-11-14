import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const startsAtHome = (path: string) => path === '~' || path.startsWith('~/') || path.startsWith('~\\')

const MSYS_DRIVE = /^\/([a-zA-Z])(?:\/(.*))?$/

export const defaultHome = () => join(homedir(), '.sand')

export const expandHome = (path: string, base?: string) => {
  const expanded = startsAtHome(path) ? join(homedir(), path.slice(1)) : path
  return base ? resolve(base, expanded) : resolve(expanded)
}

export const fromMsys = (path: string) => {
  if (process.platform !== 'win32') return path
  const drive = MSYS_DRIVE.exec(path)
  if (drive) return `${drive[1]!.toUpperCase()}:/${drive[2] ?? ''}`
  if (path === '/tmp' || path.startsWith('/tmp/')) return join(tmpdir(), path.slice(4))
  return path
}
