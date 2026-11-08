import { stat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import type { OfferedPath, OfferInput } from '../contract'
import type { TransferStore } from '../transfers'

const scan = (folder: string) => Array.fromAsync(new Bun.Glob('**/*').scan({ cwd: folder, dot: true, onlyFiles: true }))

const inside = (folder: string, path: string) => {
  const rel = relative(folder, resolve(folder, path))
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`${path} is not inside ${folder}`)
  return rel
}

const filesAt = async (folder: string, path: string) => {
  const info = await stat(join(folder, path)).catch(() => undefined)
  if (info?.isFile()) return [path]
  if (!info?.isDirectory()) return []
  return (await scan(join(folder, path))).map(file => join(path, file))
}

const chosen = async (folder: string, paths: string[]) => {
  const found = await Promise.all(paths.map(path => filesAt(folder, inside(folder, path))))
  return [...new Set(found.flat())]
}

const pack = async (folder: string, files: string[], into: string) => {
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) entries[file.replaceAll('\\', '/')] = await Bun.file(join(folder, file)).bytes()
  await Bun.Archive.write(into, entries)
}

export const offerPath =
  (transfers: TransferStore) =>
  async ({ path, files }: OfferInput): Promise<OfferedPath> => {
    if (!isAbsolute(path)) throw new Error(`${path} is not an absolute path`)
    if (!(await stat(path)).isDirectory()) return { ...transfers.offer(path), folder: false }
    const packed = await transfers.reserve()
    await pack(path, files ? await chosen(path, files) : await scan(path), packed)
    return { ...transfers.offer(packed), folder: true }
  }
