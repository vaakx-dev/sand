import { isRecord, serial } from '@sand/kit'
import { writePrivateJson } from '@sand/kit/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { ShareInfo } from '../share/info'

export type CachedInfo = Omit<ShareInfo, 'limits'>

export type PeerCache = Record<string, CachedInfo>

const valid = (value: unknown): value is CachedInfo =>
  isRecord(value) && Array.isArray(value.accounts) && Array.isArray(value.models) && Array.isArray(value.levels) && !!value.prices

export const peerCache = (home: string) => {
  const file = join(home, 'cache', 'shared-accounts.json')
  const queue = serial()
  return {
    async read(): Promise<PeerCache> {
      try {
        const data: unknown = await Bun.file(file).json()
        return Object.fromEntries(Object.entries(data ?? {}).filter((entry): entry is [string, CachedInfo] => valid(entry[1])))
      } catch {
        return {}
      }
    },
    write(cache: PeerCache) {
      return queue(async () => {
        await mkdir(dirname(file), { recursive: true })
        await writePrivateJson(file, cache)
      })
    },
  }
}
