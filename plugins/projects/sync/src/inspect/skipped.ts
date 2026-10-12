import type { SyncSkipped } from '../contract'
import { join } from 'node:path'
import { diskBytes } from './disk'

const limit = 20

export const skippedEntries = async (folder: string, names: string[]): Promise<SyncSkipped[]> => {
  const sized = await Promise.all(names.slice(0, limit * 2).map(async name => ({ name, bytes: await diskBytes(join(folder, name)) })))
  return sized.sort((a, b) => b.bytes - a.bytes).slice(0, limit)
}
