import { keyedSerial } from '@sand/kit'
import type { WireHandler, WireRequestType } from '@sand/protocol'
import { applySnapshot } from './apply/apply'
import { resolveConflicts } from './conflicts/resolve'
import { hiddenFor } from './folder/hidden'
import { absolutePath, refuseBlocked } from './folder/paths'
import { inspectFolder } from './inspect/inspect'
import { runSetup } from './setup/run'
import { folderState } from './state/state'
import { exportHistory, exportSnapshot } from './transfer/export'
import { importHistory, importSnapshot } from './transfer/import'
import { createTransfers } from './transfer/transfers'

type SyncHandlers = { [K in Extract<WireRequestType, `sync.${string}`>]: WireHandler<K> }

const isCommitId = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{40,64}$/.test(value)

export const createSync = (home: string) => {
  const transfers = createTransfers()
  const locked = keyedSerial()

  const open = async (path: unknown) => {
    const hidden = hiddenFor(home, absolutePath(path))
    await refuseBlocked(hidden.folder, home)
    return hidden
  }

  const handlers: SyncHandlers = {
    'sync.state': async ({ path }) => {
      const hidden = await open(path)
      return locked(hidden.dir, () => folderState(hidden))
    },
    'sync.inspect': ({ path }) => {
      const hidden = hiddenFor(home, absolutePath(path))
      return locked(hidden.dir, () => inspectFolder(hidden, home))
    },
    'sync.export': async ({ path, kind, have = [] }) => {
      const hidden = await open(path)
      if (kind === 'history') return exportHistory(hidden.folder, transfers)
      return locked(hidden.dir, () => exportSnapshot(hidden, have.filter(isCommitId), transfers))
    },
    'sync.pull': ({ transfer, index }) => transfers.chunk(transfer, index),
    'sync.push': async ({ transfer, index, data }) => {
      await transfers.receive(transfer, index, data)
    },
    'sync.import': async ({ transfer, kind, path, chunks, commit, branch, remotes }) => {
      const hidden = await open(path)
      try {
        const bundle = transfers.received(transfer, chunks)
        if (kind === 'history') return await importHistory(hidden.folder, bundle, branch, remotes)
        return await locked(hidden.dir, () => importSnapshot(hidden, bundle, commit))
      } finally {
        await transfers.release(transfer)
      }
    },
    'sync.apply': async ({ path, commit, mode }) => {
      const hidden = await open(path)
      if (!isCommitId(commit)) throw new Error('Invalid snapshot id')
      return locked(hidden.dir, () => applySnapshot(hidden, commit, mode))
    },
    'sync.resolve': async ({ path, picks }) => {
      const hidden = await open(path)
      return locked(hidden.dir, () => resolveConflicts(hidden, picks))
    },
    'sync.setup': ({ path, command }) => runSetup(absolutePath(path), command),
  }

  return { handlers, dispose: transfers.dispose }
}
