import { keyedSerial } from '@sand/kit'
import type { WireHandler, WireRequestType } from '@sand/protocol'
import type { Transfers } from '@sand/transfers/contract'
import { applySnapshot } from './apply/apply'
import { resolveConflicts } from './conflicts/resolve'
import { absolutePath, refuseBlocked } from './folder/paths'
import { createSyncedFolders } from './folder/synced'
import { exportHistory, importHistory } from './git/history'
import { inspectFolder } from './inspect/inspect'
import { runSetup } from './setup/run'
import { folderState } from './state/state'
import { isObjectId } from './store/tree'
import { exportSnapshot } from './transfer/export'
import { importSnapshot } from './transfer/import'

type SyncHandlers = { [K in Extract<WireRequestType, `sync.${string}`>]: WireHandler<K> }

export const createSync = (home: string, transfers: Transfers) => {
  const locked = keyedSerial()
  const syncedFolder = createSyncedFolders(home)

  const open = async (path: unknown) => {
    const folder = absolutePath(path)
    await refuseBlocked(folder, home)
    return syncedFolder(folder)
  }

  const handlers: SyncHandlers = {
    'sync.state': async ({ path }) => {
      const synced = await open(path)
      return locked(synced.dir, () => folderState(synced))
    },
    'sync.inspect': async ({ path }) => {
      const synced = await syncedFolder(absolutePath(path))
      return locked(synced.dir, () => inspectFolder(synced, home))
    },
    'sync.export': async ({ path, kind, have = [] }) => {
      const synced = await open(path)
      if (kind === 'history') return exportHistory(synced.folder, transfers)
      return locked(synced.dir, () => exportSnapshot(synced, have.filter(isObjectId), transfers))
    },
    'sync.import': async ({ transfer, kind, path, chunks, size, commit, branch, remotes }) => {
      const synced = await open(path)
      try {
        const file = await transfers.received(transfer, chunks, size)
        if (kind === 'history') return await importHistory(synced.folder, file, branch, remotes)
        return await locked(synced.dir, () => importSnapshot(synced, file, commit))
      } finally {
        await transfers.release(transfer)
      }
    },
    'sync.apply': async ({ path, commit, mode }) => {
      const synced = await open(path)
      if (!isObjectId(commit)) throw new Error('Invalid snapshot id')
      return locked(synced.dir, () => applySnapshot(synced, commit, mode))
    },
    'sync.resolve': async ({ path, picks }) => {
      const synced = await open(path)
      return locked(synced.dir, () => resolveConflicts(synced, picks))
    },
    'sync.setup': ({ path, command }) => runSetup(absolutePath(path), command),
  }

  return handlers
}
