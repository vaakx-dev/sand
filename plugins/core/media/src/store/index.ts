import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { StoredMedia } from '../contract'
import { dimensions } from './sniff'
import { extensionOf, isText, storedExtensions } from './types'

export const isHash = (value: string) => /^[a-f0-9]{64}$/.test(value)

const sniffed = 65_536

const hashOf = (bytes: Uint8Array) => new Bun.CryptoHasher('sha256').update(bytes).digest('hex')

const measure = (bytes: Uint8Array, mediaType: string) => (mediaType.startsWith('image/') ? dimensions(bytes.subarray(0, sniffed)) : undefined)

const touch = (path: string) => {
  const now = new Date()
  utimesSync(path, now, now)
}

const write = (path: string, bytes: Uint8Array) => {
  const temp = `${path}.${Bun.randomUUIDv7()}.tmp`
  writeFileSync(temp, bytes)
  try {
    renameSync(temp, path)
  } catch (error) {
    rmSync(temp, { force: true })
    if (!existsSync(path)) throw error
  }
}

export interface Located {
  path: string
  extension: string
}

export const createStore = (folder: string) => {
  mkdirSync(folder, { recursive: true })
  const path = (media: StoredMedia) => join(folder, `${media.hash}.${extensionOf(media.mediaType)}`)

  const put = (bytes: Uint8Array, mediaType: string): StoredMedia => {
    const media: StoredMedia = { hash: hashOf(bytes), size: bytes.length, mediaType, ...measure(bytes, mediaType) }
    const target = path(media)
    if (existsSync(target)) touch(target)
    else write(target, bytes)
    return media
  }

  const data = (media: StoredMedia) => {
    const target = path(media)
    if (!isHash(media.hash) || !existsSync(target)) return undefined
    const bytes = readFileSync(target)
    return isText(media.mediaType) ? bytes.toString('utf8') : bytes.toString('base64')
  }

  const locate = (hash: string): Located | undefined => {
    if (!isHash(hash)) return undefined
    for (const extension of storedExtensions) {
      const found = join(folder, `${hash}.${extension}`)
      if (existsSync(found)) return { path: found, extension }
    }
    return undefined
  }

  return { folder, path, put, data, locate }
}

export type Store = ReturnType<typeof createStore>
