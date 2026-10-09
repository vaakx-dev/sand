import { replaceFile } from '@sand/host'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fetchOfficialBun } from './github'

export interface CachedBun {
  file: string
  version: string
  sha256: string
}

const pending = new Map<string, Promise<CachedBun>>()

const cacheFolder = (home: string, version: string, target: string) => join(home, 'cache', 'bun', version, target)

const readCached = async (folder: string, version: string): Promise<CachedBun | undefined> => {
  const file = join(folder, 'bun.gz')
  const sha256 = (
    await Bun.file(join(folder, 'bun.sha256'))
      .text()
      .catch(() => '')
  ).trim()
  if (/^[0-9a-f]{64}$/.test(sha256) && existsSync(file)) return { file, version, sha256 }
}

const writeAtomic = async (file: string, data: Uint8Array | string) => {
  const temp = `${file}.tmp-${Bun.randomUUIDv7()}`
  await Bun.write(temp, data)
  await replaceFile(temp, file)
}

const fillCache = async (folder: string, version: string, target: string): Promise<CachedBun> => {
  const binary = await fetchOfficialBun(version, target)
  const sha256 = new Bun.CryptoHasher('sha256').update(binary).digest('hex')
  await mkdir(folder, { recursive: true })
  const file = join(folder, 'bun.gz')
  await writeAtomic(file, Bun.gzipSync(binary))
  await writeAtomic(join(folder, 'bun.sha256'), sha256)
  return { file, version, sha256 }
}

const loadBun = async (home: string, version: string, target: string) => {
  const folder = cacheFolder(home, version, target)
  return (await readCached(folder, version)) ?? (await fillCache(folder, version, target))
}

export const cachedBun = (home: string, target: string): Promise<CachedBun> => {
  const version = Bun.version
  if (version.includes('-')) return Promise.reject(new Error('sand can only share release builds of Bun'))
  const key = cacheFolder(home, version, target)
  const running = pending.get(key)
  if (running) return running
  const job = loadBun(home, version, target).finally(() => pending.delete(key))
  pending.set(key, job)
  return job
}
