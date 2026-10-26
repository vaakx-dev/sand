import { filesChanges, filesList, filesRead, type FileChange } from '@sand/project/contract'
import type { Threads, Wire } from '@sand/web-client/contract'
import { batch, sig } from '@vaakx-dev/vrui'
import { buildTree, foldersOf, type Folder } from './tree/build'

interface Place {
  cwd: string
  device: string
}

export interface Listing {
  files: string[]
  tree: Folder
  changes: Record<string, FileChange>
  changedFolders: Set<string>
}

export type Loaded = { listing: Listing } | { error: string } | undefined

export const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

const noChanges = (): Record<string, FileChange> => ({})

export const filesModel = (wire: Wire, threads: Threads) => {
  const here = (): Place => ({ cwd: threads.cwd(), device: threads.device() })
  const place = sig(here())
  const loaded = sig<Loaded>(undefined)
  const opened = sig<string | undefined>(undefined)
  const query = sig('')
  const expanded = sig<ReadonlySet<string>>(new Set())
  const version = sig(0)
  let started = false
  let latest = 0

  const fetchListing = async ({ cwd, device }: Place): Promise<Listing> => {
    const [files, changes] = await Promise.all([wire.call(filesList, { cwd }, device), wire.call(filesChanges, { cwd }, device).catch(noChanges)])
    return { files, tree: buildTree(files), changes, changedFolders: foldersOf(Object.keys(changes)) }
  }

  const refresh = async () => {
    const at = place.get()
    if (!started || !at.cwd) return
    const ticket = ++latest
    version.update(value => value + 1)
    try {
      const listing = await fetchListing(at)
      if (ticket === latest) loaded.set({ listing })
    } catch (error) {
      if (ticket === latest) loaded.set({ error: message(error) })
    }
  }

  return {
    place,
    loaded,
    opened,
    query,
    expanded,
    version,
    refresh: () => void refresh(),
    start() {
      if (started) return
      started = true
      void refresh()
    },
    reload() {
      loaded.set(undefined)
      void refresh()
    },
    toggle(path: string) {
      const next = new Set(expanded.get())
      if (!next.delete(path)) next.add(path)
      expanded.set(next)
    },
    read(path: string) {
      const { cwd, device } = place.get()
      return wire.call(filesRead, { cwd, path }, device)
    },
    follow() {
      const next = here()
      const now = place.get()
      if (next.cwd === now.cwd && next.device === now.device) return
      batch(() => {
        place.set(next)
        loaded.set(undefined)
        opened.set(undefined)
        query.set('')
        expanded.set(new Set())
      })
      void refresh()
    },
  }
}

export type FilesModel = ReturnType<typeof filesModel>
