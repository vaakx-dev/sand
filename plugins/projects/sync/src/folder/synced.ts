import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { createStore, type Store } from '../store/store'
import { exists } from './stat'

export interface SyncedFolder {
  folder: string
  dir: string
  store: Store
}

const dropGitStore = async (dir: string) => {
  const repo = join(dir, 'repo.git')
  const index = join(dir, 'index')
  if (!(await exists(repo)) && !(await exists(index))) return
  await rm(repo, { recursive: true, force: true })
  await rm(index, { force: true })
  await rm(join(dir, 'state.json'), { force: true })
}

const prepare = async (folder: string, dir: string): Promise<SyncedFolder> => {
  await dropGitStore(dir)
  return { folder, dir, store: createStore(dir) }
}

export const createSyncedFolders = (home: string) => {
  const opened = new Map<string, Promise<SyncedFolder>>()
  return (folder: string) => {
    const dir = join(home, 'sync', new Bun.CryptoHasher('sha1').update(folder).digest('hex'))
    const known = opened.get(dir)
    if (known) return known
    const found = prepare(folder, dir)
    opened.set(dir, found)
    found.catch(() => opened.delete(dir))
    return found
  }
}
