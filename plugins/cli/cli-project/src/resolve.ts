import type { SyncPick, SyncResolved, SyncState } from '@sand/sync/contract'
import { plural } from '@sand/kit'
import { usage } from './usage'
import type { ProjectFlags } from './flags'
import { loadGroup } from './find'
import { locationOn } from './groups'
import type { Pcs } from './pcs'

const printRemaining = (remaining: string[]) => {
  if (!remaining.length) return console.log('all conflicts resolved')
  console.log(`${plural(remaining.length, 'conflict')} left:`)
  remaining.forEach(file => console.log(`  ${file}`))
}

export const resolveConflicts = async (pcs: Pcs, [value, ...files]: string[], { on, ours, theirs }: ProjectFlags) => {
  if (!value || !on || ours === theirs) throw new Error(usage)
  const pc = pcs.named(on)
  const { group } = await loadGroup(pcs, value)
  const location = locationOn(group, pc)
  if (!location) throw new Error(`${group.name} is not on ${pc.name}`)
  const { path } = location
  const state = await pcs.call<SyncState>({ type: 'sync.state', path }, pc.device)
  const targets = files.length ? files : state.conflicts
  if (!targets.length) return console.log(`${group.name} has no conflicts on ${pc.name}`)
  const pick: SyncPick = ours ? 'ours' : 'theirs'
  const picks = Object.fromEntries(targets.map(file => [file, pick]))
  const resolved = await pcs.call<SyncResolved>({ type: 'sync.resolve', path, picks }, pc.device)
  console.log(`${ours ? 'kept the local version' : 'took the incoming version'} of ${plural(targets.length, 'file')} on ${pc.name}`)
  printRemaining(resolved.remaining)
}
