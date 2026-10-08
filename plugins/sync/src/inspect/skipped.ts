import type { SyncSkipped } from '@sand/protocol'
import { join } from 'node:path'
import { isSecret } from '../folder/exclude'
import { hiddenOut, type Hidden } from '../folder/hidden'
import { diskBytes } from './disk'

const limit = 20

export const skippedEntries = async (hidden: Hidden): Promise<SyncSkipped[]> => {
  const listed = await hiddenOut(hidden, ['ls-files', '-z', '-o', '-i', '--exclude-standard', '--directory'])
  const names = listed
    .split('\0')
    .filter(Boolean)
    .map(entry => entry.replace(/\/$/, ''))
    .filter(name => !name.includes('/') && !isSecret(name))
  const sized = await Promise.all([...new Set(names)].slice(0, limit * 2).map(async name => ({ name, bytes: await diskBytes(join(hidden.folder, name)) })))
  return sized.sort((a, b) => b.bytes - a.bytes).slice(0, limit)
}
