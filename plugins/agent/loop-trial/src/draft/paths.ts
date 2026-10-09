import { homedir } from 'node:os'
import { basename, join, relative, sep } from 'node:path'

export const pluginsDir = (home: string) => join(home, 'plugins')

export const draftsDir = (home: string) => join(home, 'drafts')

export const validName = (name: string) => Boolean(name) && !name.startsWith('.') && basename(name) === name

export const shortPath = (path: string) => {
  const rel = relative(homedir(), path)
  return rel && !rel.startsWith('..') && !rel.startsWith(sep) ? `~/${rel}` : path
}
