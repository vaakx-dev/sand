import { stat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import type { OfferedPath } from '../contract'
import type { TransferStore } from '../transfers'

const pack = async (folder: string, into: string) => {
  const entries: Record<string, Uint8Array> = {}
  for await (const file of new Bun.Glob('**/*').scan({ cwd: folder, dot: true, onlyFiles: true }))
    entries[file.replaceAll('\\', '/')] = await Bun.file(join(folder, file)).bytes()
  await Bun.Archive.write(into, entries)
}

export const offerPath =
  (transfers: TransferStore) =>
  async ({ path }: { path: string }): Promise<OfferedPath> => {
    if (!isAbsolute(path)) throw new Error(`${path} is not an absolute path`)
    if (!(await stat(path)).isDirectory()) return { ...transfers.offer(path), folder: false }
    const packed = await transfers.reserve()
    await pack(path, packed)
    return { ...transfers.offer(packed), folder: true }
  }
