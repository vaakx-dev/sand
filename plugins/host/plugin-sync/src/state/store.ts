import { serial } from '@sand/util'
import { readState, writePrivateJson } from '@sand/util/fs'
import { join } from 'node:path'
import { z } from 'zod'
import type { SyncFile } from '../types'

const empty = (): SyncFile => ({ local: [], bases: {}, skipped: {} })

const strings = z
  .record(z.string(), z.unknown())
  .transform(value => Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')))
  .catch({})

const nested = z.record(z.string(), strings).catch({})

const names = z
  .array(z.unknown())
  .transform(value => [...new Set(value.filter((name): name is string => typeof name === 'string'))].sort())
  .catch([])

const syncFile = z.object({ local: names, bases: nested, skipped: nested }).catch(empty)

const syncFileOf = (data: unknown): SyncFile => syncFile.parse(data)

const read = async (file: string): Promise<SyncFile> => (await readState(file, syncFileOf)) ?? empty()

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
  const queue = serial()
  const save = (next: SyncFile) => {
    data = next
    return queue(() => writePrivateJson(file, data))
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
