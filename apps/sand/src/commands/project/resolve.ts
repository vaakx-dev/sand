import type { SyncPick, SyncResolved, SyncState } from '@sand/protocol'
import { plural } from '@sand/kit'
import { usage } from './usage'
import type { ProjectFlags } from './flags'
import { findGroup } from './find'
import { loadGroups, locationOn } from './groups'
import type { Pcs } from './pcs'

export const resolveConflicts = async (pcs: Pcs, [value, ...files]: string[], { on, ours, theirs }: ProjectFlags) => {
  if (!value || !on || ours === theirs) throw new Error(usage)
  const pc = pcs.named(on)
  const { groups } = await loadGroups(pcs)
  const group = findGroup(groups, value)
  const location = locationOn(group, pc)
  if (!location) throw new Error(`${group.name} is not on ${pc.name}`)
  const path = location.path
  const state = await pcs.call<SyncState>({ type: 'sync.state', path }, pc.device)
  const targets = files.length ? files : state.conflicts
  if (!targets.length) return console.log(`${group.name} has no conflicts on ${pc.name}`)
  const pick: SyncPick = ours ? 'ours' : 'theirs'
  const picks = Object.fromEntries(targets.map(file => [file, pick]))
  const resolved = await pcs.call<SyncResolved>({ type: 'sync.resolve', path, picks }, pc.device)
  console.log(`${pick === 'ours' ? 'kept the local version' : 'took the incoming version'} of ${plural(targets.length, 'file')} on ${pc.name}`)
  if (resolved.remaining.length) {
    console.log(`${plural(resolved.remaining.length, 'conflict')} left:`)
    resolved.remaining.forEach(file => console.log(`  ${file}`))
  } else console.log('all conflicts resolved')
}
