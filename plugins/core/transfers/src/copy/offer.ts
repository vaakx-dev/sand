import { stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import type { OfferedPath, OfferInput } from '../contract'
import { pack } from '../tar/pack'
import type { TransferStore } from '../transfers'

const inside = (folder: string, path: string) => {
  const rel = relative(folder, resolve(folder, path))
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`${path} is not inside ${folder}`)
  return rel
}

export const offerPath =
  (transfers: TransferStore) =>
  async ({ path, files }: OfferInput): Promise<OfferedPath> => {
    if (!isAbsolute(path)) throw new Error(`${path} is not an absolute path`)
    if (!(await stat(path)).isDirectory()) return { ...transfers.offer(path), folder: false }
    const packed = await transfers.reserve()
    await pack(path, files?.map(file => inside(path, file)), packed)
    return { ...transfers.offer(packed), folder: true }
  }
