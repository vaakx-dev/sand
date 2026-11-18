import { bytes, errorMessage } from '@sand/util'
import { freeBytes } from '@sand/util/fs'
import type { Database } from 'bun:sqlite'
import { tmpdir } from 'node:os'
import { dirname } from 'node:path'

interface Space {
  used: number
  unused: number
}

export interface CompactFailure {
  error: string
}

const UNUSED_SHARE = 0.25
const UNUSED_BYTES = 64 * 1024 * 1024

const spaceOf = (db: Database) => {
  const pages = db
    .query<{ size: number; count: number; free: number }, []>(
      'select page_size as size, page_count as count, freelist_count as free from pragma_page_size(), pragma_page_count(), pragma_freelist_count()',
    )
    .get()!
  return { used: (pages.count - pages.free) * pages.size, unused: pages.free * pages.size }
}

const worthCompacting = ({ used, unused }: Space) => unused >= UNUSED_BYTES && unused >= (used + unused) * UNUSED_SHARE

const roomProblem = (db: Database, { used, unused }: Space) => {
  const needed = 2 * used
  const free = freeBytes(dirname(db.filename))
  if (free >= needed && freeBytes(tmpdir()) >= used) return undefined
  return `sand.db holds ${bytes(unused)} of unused space, and giving it back needs ${bytes(needed)} free on disk but there is ${bytes(free)}. Free up some space and start sand again.`
}

const vacuum = (db: Database): CompactFailure | undefined => {
  try {
    db.run('vacuum')
    db.run('pragma wal_checkpoint(truncate)')
    return undefined
  } catch (error) {
    return { error: `sand.db could not give back its unused space: ${errorMessage(error)}` }
  }
}

const compact = (db: Database): CompactFailure | undefined => {
  const space = spaceOf(db)
  if (!worthCompacting(space)) return undefined
  const problem = roomProblem(db, space)
  return problem ? { error: problem } : vacuum(db)
}

export { compact }
