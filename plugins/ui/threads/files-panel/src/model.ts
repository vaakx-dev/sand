import type { Wire } from '@sand/devices-contract'
import { filesList, filesRead } from '@sand/project/contract'
import type { Threads } from '@sand/web-client/contract'
import { batch, sig } from '@vaakx-dev/vrui'
import { changesOf, noChanges, sameChanges, shapeOf, type Changes } from './changes'
import type { FileMarksSource, FilesFolder } from './contract'
import { buildTree, type Folder } from './tree/build'

export interface Listing {
  files: string[]
  tree: Folder
}

export type Loaded = { listing: Listing } | { error: string } | undefined

export const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const filesModel = (wire: Wire, threads: Threads) => {
  const here = (): FilesFolder => ({ cwd: threads.cwd(), device: threads.device() })
  const place = sig(here())
  const loaded = sig<Loaded>(undefined)
  const changes = sig<Changes>(noChanges)
  const opened = sig<string | undefined>(undefined)
  const query = sig('')
  const expanded = sig<ReadonlySet<string>>(new Set())
  const version = sig(0)
  let started = false
  let latest = 0
  let source: FileMarksSource | undefined
  let unfollow: (() => void) | undefined
  let session = 0
  let shape: string | undefined
  let watched = false

  const rereadOpenFile = () => version.update(value => value + 1)

  const relist = async () => {
    const at = place.get()
    if (!started || !at.cwd) return
    const ticket = ++latest
    rereadOpenFile()
    try {
      const files = await wire.call(filesList, { cwd: at.cwd }, at.device)
      if (ticket === latest) loaded.set({ listing: { files, tree: buildTree(files) } })
    } catch (error) {
      if (ticket === latest) loaded.set({ error: message(error) })
    }
  }

  const untrack = () => {
    session++
    unfollow?.()
    unfollow = undefined
    shape = undefined
    watched = false
    changes.set(noChanges)
  }

  const track = () => {
    untrack()
    const at = place.get()
    if (!started || !source || !at.cwd) return
    const mine = session
    unfollow = source.follow(at, marks => {
      if (mine !== session) return
      watched = marks !== undefined
      const next = changesOf(marks)
      const nextShape = shapeOf(next)
      if (!sameChanges(changes.get(), next)) changes.set(next)
      if (!marks) return
      if (shape !== undefined && shape !== nextShape) void relist()
      shape = nextShape
    })
  }

  return {
    place,
    loaded,
    changes,
    opened,
    query,
    expanded,
    version,
    start() {
      if (started) return
      started = true
      track()
      void relist()
    },
    useMarks(found: FileMarksSource | undefined) {
      source = found
      track()
      if (!found) return
      return () => {
        if (source !== found) return
        source = undefined
        untrack()
      }
    },
    reload() {
      loaded.set(undefined)
      void relist()
    },
    agentFinished() {
      if (watched) rereadOpenFile()
      else void relist()
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
      track()
      void relist()
    },
  }
}

export type FilesModel = ReturnType<typeof filesModel>
