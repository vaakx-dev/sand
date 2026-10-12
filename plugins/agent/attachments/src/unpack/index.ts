import type { UnpackedFolder } from '@sand/messages'
import { basename, dirname, join } from 'node:path'
import { createBudget, type Budget } from './budget'
import { untar } from './tar'
import { unzip } from './zip/extract'

type Unpacker = (path: string, folder: string, budget: Budget) => Promise<string[]>

const listedEntries = 50

const unpackers: [suffix: string, unpacker: Unpacker][] = [
  ['.zip', unzip],
  ['.tar.gz', untar],
  ['.tgz', untar],
  ['.tar', untar],
]

const listing = async (folder: string) => {
  const found = await Array.fromAsync(new Bun.Glob('**/*').scan({ cwd: folder, onlyFiles: true, dot: true }))
  const files = found.map(file => file.replaceAll('\\', '/')).sort()
  return { files: files.length, entries: files.slice(0, listedEntries) }
}

export const unpack = async (path: string): Promise<UnpackedFolder | undefined> => {
  const name = basename(path)
  const found = unpackers.find(([suffix]) => name.toLowerCase().endsWith(suffix) && name.length > suffix.length)
  if (!found) return undefined
  const [suffix, unpacker] = found
  const folder = join(dirname(path), name.slice(0, -suffix.length))
  const notes = await unpacker(path, folder, createBudget())
  return { path: folder, ...(await listing(folder)), ...(notes.length > 0 && { notes }) }
}
