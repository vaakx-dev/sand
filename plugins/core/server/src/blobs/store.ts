import { writeAtomic } from '@sand/kit/fs'
import { readdir, rm, stat, utimes } from 'node:fs/promises'
import { join } from 'node:path'

const blobHash = /^[a-f0-9]{64}$/

const touchEvery = 86_400_000

export interface BlobStore {
  file(hash: string): Promise<Bun.BunFile | undefined>
  put(hash: string, bytes: () => Uint8Array): void
  sweep(cutoff: number): Promise<void>
}

export type FindBlob = (hash: string, session?: string | null) => Promise<Bun.BunFile | undefined>

export const createBlobStore = (folder: string, report: (error: unknown) => void): BlobStore => {
  const touched = new Map<string, number>()
  const pending = new Map<string, Promise<void>>()
  const path = (name: string) => join(folder, name)

  const queue = (hash: string, job: () => Promise<void>) => {
    const run: Promise<void> = (pending.get(hash) ?? Promise.resolve()).then(job).finally(() => {
      if (pending.get(hash) === run) pending.delete(hash)
    })
    pending.set(hash, run)
    return run
  }

  const ensure = async (hash: string, bytes: () => Uint8Array) => {
    const target = path(hash)
    const now = new Date()
    if (await Bun.file(target).exists()) return utimes(target, now, now)
    await writeAtomic(target, bytes())
  }

  const expired = async (name: string, cutoff: number) => {
    const info = await stat(path(name)).catch(() => undefined)
    return Boolean(info?.isFile() && info.mtimeMs < cutoff)
  }

  const inUse = (hash: string, cutoff: number) => pending.has(hash) || (touched.get(hash) ?? 0) >= cutoff

  const remove = (name: string) => rm(path(name), { force: true }).catch(() => {})

  return {
    async file(hash) {
      if (!blobHash.test(hash)) return undefined
      await pending.get(hash)?.catch(() => {})
      const file = Bun.file(path(hash))
      if (await file.exists()) return file
      touched.delete(hash)
      return undefined
    },
    put(hash, bytes) {
      const now = Date.now()
      if (now - (touched.get(hash) ?? 0) < touchEvery) return
      touched.set(hash, now)
      queue(hash, () => ensure(hash, bytes)).catch(error => {
        touched.delete(hash)
        report(error)
      })
    },
    async sweep(cutoff) {
      const names = await readdir(folder).catch((): string[] => [])
      for (const name of names) {
        if (name.endsWith('.tmp')) {
          if (await expired(name, cutoff)) await remove(name)
          continue
        }
        if (!blobHash.test(name) || inUse(name, cutoff)) continue
        if (!(await expired(name, cutoff)) || inUse(name, cutoff)) continue
        touched.delete(name)
        await queue(name, () => remove(name))
      }
    },
  }
}
