import { expandHome } from '@sand/kit/fs'
import { realpath } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { isAbsolute, parse, relative, resolve, sep } from 'node:path'

export const absolutePath = (path: unknown) => {
  if (typeof path !== 'string' || !path) throw new Error('A folder path is required')
  if (path !== '~' && !path.startsWith('~/') && !path.startsWith('~\\') && !isAbsolute(path)) throw new Error(`The path must be absolute: ${path}`)
  return expandHome(path)
}

const real = (path: string) => realpath(path).catch(() => resolve(path))

const contains = (outer: string, inner: string) => {
  const rel = relative(outer, inner)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

export const blockedReason = async (folder: string, sandHome: string) => {
  const target = await real(folder)
  if (target === parse(target).root) return 'Copying the whole filesystem is not supported'
  if (target === (await real(homedir()))) return 'Copying your whole home folder is not supported'
  if (target === (await real(tmpdir()))) return 'Copying the temporary folder is not supported'
  if (contains(target, await real(homedir())) || contains(target, await real(sandHome))) return 'Copying a folder that contains your home folder is not supported'
  return undefined
}

export const refuseBlocked = async (folder: string, sandHome: string) => {
  const reason = await blockedReason(folder, sandHome)
  if (reason) throw new Error(reason)
}

export const inside = (folder: string, path: string) => {
  const target = resolve(folder, path)
  return target !== folder && target.startsWith(folder + sep) ? target : undefined
}
