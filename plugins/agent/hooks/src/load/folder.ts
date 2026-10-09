import type { Session } from '@sand/sessions-sqlite/contract'
import type {} from '@sand/watch/contract'
import { evict, type Context } from 'drydock'
import { existsSync } from 'node:fs'
import type { HookFileState, HookScope } from '../contract'
import { folderHash, readHookFiles, type HookSource } from './files'
import { mountFile, type MountedFile, type SharedEnv } from './module'

export interface FolderSetup {
  scope: HookScope
  root(dir: string): string
  source(root: string, file: HookSource): string
  matches(root: string): (session: Session | undefined) => boolean
  allowed(root: string, hash: string): Promise<boolean>
}

export interface HookFolder {
  dir: string
  root: string
  hash: string
  files: HookSource[]
  trusted: boolean
}

interface Mounted {
  text: string
  file: MountedFile
}

const empty: HookFolder = { dir: '', root: '', hash: '', files: [], trusted: true }

export const hookFolders = (ctx: Context<'watcher'>, shared: SharedEnv, setup: FolderSetup) => {
  const folders = new Map<string, HookFolder>()
  const mounts = new Map<string, Map<string, Mounted>>()
  const queues = new Map<string, Promise<unknown>>()

  const queued = <T>(dir: string, work: () => Promise<T>) => {
    const next = (queues.get(dir) ?? Promise.resolve()).then(work, work)
    queues.set(dir, next.catch(() => undefined))
    return next
  }

  const unmount = (dir: string, keep: (path: string, mounted: Mounted) => boolean = () => false) => {
    const own = mounts.get(dir)
    if (!own) return
    for (const [path, mounted] of own) {
      if (keep(path, mounted)) continue
      mounted.file.dispose()
      own.delete(path)
    }
  }

  const sync = async (folder: HookFolder) => {
    const own = mounts.get(folder.dir) ?? new Map<string, Mounted>()
    mounts.set(folder.dir, own)
    if (!folder.trusted) return unmount(folder.dir)
    const texts = new Map(folder.files.map(file => [file.path, file.text]))
    unmount(folder.dir, (path, mounted) => texts.get(path) === mounted.text)
    const fresh = folder.files.filter(file => !own.has(file.path))
    if (!fresh.length) return
    evict(folder.dir)
    const matches = setup.matches(folder.root)
    for (const file of fresh) {
      const mounted = await mountFile(ctx, file, { scope: setup.scope, folder: folder.root, source: setup.source(folder.root, file), matches }, shared)
      own.set(file.path, { text: file.text, file: mounted })
    }
  }

  const load = (dir: string) =>
    queued(dir, async () => {
      const files = await readHookFiles(dir)
      const root = setup.root(dir)
      const hash = folderHash(files)
      const folder: HookFolder = { dir, root, hash, files, trusted: await setup.allowed(root, hash) }
      folders.set(dir, folder)
      await sync(folder)
      return folder
    })

  const changed = (dir: string) => {
    if (existsSync(dir)) return
    folders.delete(dir)
    unmount(dir)
  }

  const watched = ctx.watcher.folders(load, empty, changed)
  ctx.effect(() => watched.close)

  return {
    get: (dir: string) => watched.get(dir),
    trust: (dir: string) =>
      queued(dir, async () => {
        const folder = folders.get(dir)
        if (!folder) return
        folder.trusted = true
        await sync(folder)
      }),
    states(): HookFileState[] {
      return [...folders.values()].flatMap(folder =>
        folder.files.map(
          file =>
            mounts.get(folder.dir)?.get(file.path)?.file.state ?? {
              path: file.path,
              scope: setup.scope,
              folder: folder.root,
              status: folder.trusted ? 'failed' : 'untrusted',
              hooks: [],
            },
        ),
      )
    },
    trusted: (root: string) => [...folders.values()].some(folder => folder.root === root && folder.trusted),
  }
}

export type HookFolders = ReturnType<typeof hookFolders>
