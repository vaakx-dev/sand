import { serial } from '@sand/kit'
import { writePrivateJson } from '@sand/kit/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { ShareInfo } from '../share/info'

export type CachedInfo = Omit<ShareInfo, 'limits'> & { legacy?: boolean }

export type PeerCache = Record<string, CachedInfo>

const valid = (value: unknown): value is CachedInfo => {
  const info = value as Partial<CachedInfo> | undefined
  return !!info && Array.isArray(info.accounts) && Array.isArray(info.models) && Array.isArray(info.levels) && !!info.prices
}

export const peerCache = (home: string) => {
  const file = join(home, 'cache', 'shared-accounts.json')
  const queue = serial()
  return {
    async read(): Promise<PeerCache> {
      try {
        const data = (await Bun.file(file).json()) as Record<string, unknown>
        return Object.fromEntries(Object.entries(data).filter((entry): entry is [string, CachedInfo] => valid(entry[1])))
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
