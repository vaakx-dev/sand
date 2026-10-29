import { writeAtomic } from '@sand/util/fs'
import { join } from 'node:path'
import { contentType, dimensions } from './sniff'

const step = 160
const tallest = 2560
const widest = 2560
const sniffed = 65_536
const resizable = new Set(['image/png', 'image/jpeg', 'image/webp'])

export type Sized = (hash: string, file: Bun.BunFile, height: number) => Promise<Bun.BunFile>

export const askedHeight = (asked: string | null) => {
  const height = Number(asked)
  if (!asked || !Number.isInteger(height) || height <= 0) return undefined
  return Math.min(tallest, Math.ceil(height / step) * step)
}

const needsResize = async (file: Bun.BunFile, height: number) => {
  const head = new Uint8Array(await file.slice(0, sniffed).arrayBuffer())
  const size = dimensions(head)
  return resizable.has(contentType(head)) && Boolean(size && size.height > height)
}

const resize = async (file: Bun.BunFile, height: number) =>
  new Bun.Image(await file.bytes()).resize(widest, height, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).bytes()

export const createSized = (folder: string): Sized => {
  const making = new Map<string, Promise<Bun.BunFile>>()

  const make = async (file: Bun.BunFile, path: string, height: number) => {
    const made = Bun.file(path)
    if (await made.exists()) return made
    if (!(await needsResize(file, height))) return file
    await writeAtomic(path, await resize(file, height))
    return made
  }

  return (hash, file, height) => {
    const path = join(folder, `${hash}.${height}`)
    const running = making.get(path)
    if (running) return running
    const run = make(file, path, height)
      .catch(() => file)
      .finally(() => making.delete(path))
    making.set(path, run)
    return run
  }
}
