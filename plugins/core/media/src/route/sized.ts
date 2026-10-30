import { writeAtomic } from '@sand/util/fs'
import { join } from 'node:path'
import type { Located } from '../store'
import { dimensions } from '../store/sniff'

const step = 160
const tallest = 2560
const widest = 2560
const sniffed = 65_536
const resizable = new Set(['png', 'jpg', 'webp'])

export type Sized = (hash: string, original: Located, height: number) => Promise<Bun.BunFile | undefined>

export const askedHeight = (asked: string | null) => {
  const height = Number(asked)
  if (!asked || !Number.isInteger(height) || height <= 0) return undefined
  return Math.min(tallest, Math.ceil(height / step) * step)
}

const needsResize = async (file: Bun.BunFile, height: number) => {
  const size = dimensions(new Uint8Array(await file.slice(0, sniffed).arrayBuffer()))
  return Boolean(size && size.height > height)
}

const resize = async (file: Bun.BunFile, height: number) =>
  new Bun.Image(await file.bytes()).resize(widest, height, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).bytes()

export const createSized = (folder: string): Sized => {
  const making = new Map<string, Promise<Bun.BunFile | undefined>>()

  const make = async (file: Bun.BunFile, path: string, height: number) => {
    const made = Bun.file(path)
    if (await made.exists()) return made
    if (!(await needsResize(file, height))) return undefined
    await writeAtomic(path, await resize(file, height))
    return Bun.file(path)
  }

  return (hash, original, height) => {
    if (!resizable.has(original.extension)) return Promise.resolve(undefined)
    const path = join(folder, `${hash}.${height}.webp`)
    const running = making.get(path)
    if (running) return running
    const run = make(Bun.file(original.path), path, height)
      .catch(() => undefined)
      .finally(() => making.delete(path))
    making.set(path, run)
    return run
  }
}
