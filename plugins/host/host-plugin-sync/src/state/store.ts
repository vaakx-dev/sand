import { writePrivateJson } from '@sand/kit/fs'
import { join } from 'node:path'
import type { SyncFile } from '../types'

const empty = (): SyncFile => ({ local: [], bases: {}, skipped: {} })

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const strings = (value: unknown): Record<string, string> =>
  record(value)
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    : {}

const nested = (value: unknown): Record<string, Record<string, string>> =>
  record(value) ? Object.fromEntries(Object.entries(value).map(([peer, entries]) => [peer, strings(entries)])) : {}

const read = async (file: string): Promise<SyncFile> => {
  try {
    const data: unknown = await Bun.file(file).json()
    if (!record(data)) return empty()
    const local = Array.isArray(data.local) ? data.local.filter((name): name is string => typeof name === 'string') : []
    return { local: [...new Set(local)].sort(), bases: nested(data.bases), skipped: nested(data.skipped) }
  } catch {
    return empty()
  }
}

const same = (a: Record<string, string> | undefined, b: Record<string, string>) =>
  JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b).sort())

const withPeer = (map: Record<string, Record<string, string>>, peer: string, entries: Record<string, string>) => {
  const { [peer]: _, ...rest } = map
  return Object.keys(entries).length ? { ...rest, [peer]: entries } : rest
}

const keepPeers = (map: Record<string, Record<string, string>>, keep: Set<string>) =>
  Object.fromEntries(Object.entries(map).filter(([peer]) => keep.has(peer)))

export const syncStore = async (home: string) => {
  const file = join(home, 'plugin-sync.json')
  let data = await read(file)
  let saving: Promise<void> = Promise.resolve()
  const save = (next: SyncFile) => {
    data = next
    saving = saving.catch(() => {}).then(() => writePrivateJson(file, data))
    return saving
  }
  return {
    get: (): SyncFile => data,
    local: () => new Set(data.local),
    setLocal: async (plugin: string, on: boolean) => {
      const has = data.local.includes(plugin)
      if (has === on) return
      const local = on ? [...data.local, plugin].sort() : data.local.filter(name => name !== plugin)
      await save({ ...data, local })
    },
    skip: async (peer: string, entries: Record<string, string>) => {
      const next = { ...data.skipped[peer], ...entries }
      if (same(data.skipped[peer], next)) return
      await save({ ...data, skipped: withPeer(data.skipped, peer, next) })
    },
    settle: async (peer: string, bases: Record<string, string>, skipped: Record<string, string>) => {
      if (same(data.bases[peer], bases) && same(data.skipped[peer], skipped)) return
      await save({ ...data, bases: withPeer(data.bases, peer, bases), skipped: withPeer(data.skipped, peer, skipped) })
    },
    forget: async (keep: string[]) => {
      const peers = new Set(keep)
      const stale = [...Object.keys(data.bases), ...Object.keys(data.skipped)].some(peer => !peers.has(peer))
      if (!stale) return
      await save({ ...data, bases: keepPeers(data.bases, peers), skipped: keepPeers(data.skipped, peers) })
    },
  }
}

export type SyncStore = Awaited<ReturnType<typeof syncStore>>
