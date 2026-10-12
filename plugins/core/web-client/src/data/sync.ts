import type { ProjectRef } from '@sand/host-projects/contract'
import type { Sync } from '@sand/new-project/contract'
import type { SyncApplied, SyncInspect, SyncPick, SyncResolved, SyncSetup, SyncState } from '@sand/sync/contract'
import type { Wire } from '../contract'
import { copyProject, relationOf, sendProject } from '@sand/sync/flows'
import type { Context } from 'drydock'
import { entryKey } from './groups'
import type { ProjectService } from './projects'

export const createSync = (ctx: Context, wire: Wire, projects: ProjectService): Sync => {
  const states = new Map<string, SyncState>()
  const keyOf = (ref: ProjectRef) => entryKey(ref.path, ref.device)

  const refresh = async (ref: ProjectRef) => {
    const state = await wire.call<SyncState>({ type: 'sync.state', path: ref.path }, ref.device).catch(() => undefined)
    if (state) states.set(keyOf(ref), state)
    else states.delete(keyOf(ref))
    ctx.emit('sync.change')
    return state
  }

  const refreshAll = (refs: ProjectRef[]) => Promise.all(refs.map(refresh)).then(() => undefined)

  const refreshLists = (refs: ProjectRef[]) => Promise.all(refs.map(ref => projects.refresh(ref.device)))

  ctx.on('wire.hello', () => {
    states.clear()
    ctx.emit('sync.change')
  })

  return {
    state: ref => states.get(keyOf(ref)),
    refresh,
    relation(ref, against) {
      const state = states.get(keyOf(ref))
      const other = states.get(keyOf(against))
      return state && other ? relationOf(state, other) : undefined
    },
    inspect: ref => wire.call<SyncInspect>({ type: 'sync.inspect', path: ref.path }, ref.device),
    async copy(from, to, options, progress) {
      await copyProject(wire, from, to, { setup: options?.setup, project: options?.project }, progress)
      await refreshLists([from, to])
      await refreshAll([from, to])
    },
    async send(from, to, progress): Promise<SyncApplied> {
      const applied = await sendProject(wire, from, to, progress)
      await refreshAll([from, to])
      return applied
    },
    async resolve(ref, picks: Record<string, SyncPick>) {
      const resolved = await wire.call<SyncResolved>({ type: 'sync.resolve', path: ref.path, picks }, ref.device)
      await refresh(ref)
      return resolved
    },
    setup: (ref, command) => wire.call<SyncSetup>({ type: 'sync.setup', path: ref.path, command }, ref.device),
  }
}
