import { serial } from '@sand/util'
import { writePrivateJson } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import type { ShareInfo } from '../share/info'

export type CachedInfo = Omit<ShareInfo, 'limits'>

export type PeerCache = Record<string, CachedInfo>

const cachedShape = z.looseObject({ accounts: z.array(z.unknown()), models: z.array(z.unknown()), levels: z.array(z.unknown()), prices: z.unknown().refine(Boolean) })

const valid = (value: unknown): value is CachedInfo => cachedShape.safeParse(value).success

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
