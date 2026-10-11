import { isInside } from '@sand/kit'
import { expandHome, isWithin } from '@sand/kit/fs'
import { realpath } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { isAbsolute, parse, resolve } from 'node:path'

export const absolutePath = (path: unknown) => {
  if (typeof path !== 'string' || !path) throw new Error('A folder path is required')
  if (path !== '~' && !path.startsWith('~/') && !path.startsWith('~\\') && !isAbsolute(path)) throw new Error(`The path must be absolute: ${path}`)
  return expandHome(path)
}

const real = (path: string) => realpath(path).catch(() => resolve(path))

export const blockedReason = async (folder: string, sandHome: string) => {
  const target = await real(folder)
  if (target === parse(target).root) return 'Copying the whole filesystem is not supported'
  if (target === (await real(homedir()))) return 'Copying your whole home folder is not supported'
  if (target === (await real(tmpdir()))) return 'Copying the temporary folder is not supported'
  if (isWithin(await real(homedir()), target) || isWithin(await real(sandHome), target)) return 'Copying a folder that contains your home folder is not supported'
  return undefined
}

export const refuseBlocked = async (folder: string, sandHome: string) => {
  const reason = await blockedReason(folder, sandHome)
  if (reason) throw new Error(reason)
}

export const inside = (folder: string, path: string) => {
  const target = resolve(folder, path)
  return isInside(target, folder) ? target : undefined
}
