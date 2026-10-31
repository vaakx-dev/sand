import type { Wire } from '@sand/devices-contract'
import type { GitStatusClient } from '@sand/git/contract'
import { filesList, filesRead } from '@sand/project/contract'
import type { Threads } from '@sand/web-client/contract'
import { batch, sig } from '@vaakx-dev/vrui'
import { changesOf, noChanges, sameChanges, shapeOf, type Changes } from './changes'
import { buildTree, type Folder } from './tree/build'

interface Place {
  cwd: string
  device: string
}

export interface Listing {
  files: string[]
  tree: Folder
}

export type Loaded = { listing: Listing } | { error: string } | undefined

export const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const filesModel = (wire: Wire, threads: Threads) => {
  const here = (): Place => ({ cwd: threads.cwd(), device: threads.device() })
  const place = sig(here())
  const loaded = sig<Loaded>(undefined)
  const changes = sig<Changes>(noChanges)
  const opened = sig<string | undefined>(undefined)
  const query = sig('')
  const expanded = sig<ReadonlySet<string>>(new Set())
  const version = sig(0)
  let started = false
  let latest = 0
  let git: GitStatusClient | undefined
  let unfollow: (() => void) | undefined
  let session = 0
  let shape: string | undefined

  const refresh = async () => {
    const at = place.get()
    if (!started || !at.cwd) return
    const ticket = ++latest
    version.update(value => value + 1)
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
    changes.set(noChanges)
  }

  const track = () => {
    untrack()
    const at = place.get()
    if (!started || !git || !at.cwd) return
    const mine = session
    unfollow = git.follow(at, status => {
      if (mine !== session) return
      const next = changesOf(status)
      const nextShape = shapeOf(next)
      if (!sameChanges(changes.get(), next)) changes.set(next)
      if (!status) return
      if (shape !== undefined && shape !== nextShape) void refresh()
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
    refresh: () => void refresh(),
    start() {
      if (started) return
      started = true
      track()
      void refresh()
    },
    useGit(client: GitStatusClient | undefined) {
      git = client
      track()
      if (!client) return
      return () => {
        if (git !== client) return
        git = undefined
        untrack()
      }
    },
    reload() {
      loaded.set(undefined)
      void refresh()
      if (git && place.get().cwd) void git.refresh(place.get()).catch(() => undefined)
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
      void refresh()
    },
  }
}

export type FilesModel = ReturnType<typeof filesModel>
