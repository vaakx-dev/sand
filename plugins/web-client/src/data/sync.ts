import type { ProjectRef, Sync, SyncApplied, SyncInspect, SyncPick, SyncResolved, SyncSetup, SyncState, Wire } from '@sand/protocol'
import { copyProject, relationOf, sendProject, type SyncCall } from '@sand/kit'
import type { Context } from 'drydock'
import { thisDevice } from '../remotes/route'
import { entryKey } from './groups'
import type { createProjects } from './projects'

export const createSync = (ctx: Context, wire: Wire, projects: ReturnType<typeof createProjects>): Sync => {
  const states = new Map<string, SyncState>()
  const call: SyncCall = (request, device) => wire.call(request, device ?? thisDevice)
  const keyOf = (ref: ProjectRef) => entryKey(ref.path, ref.device)

  const refresh = async (ref: ProjectRef) => {
    const state = await call<SyncState>({ type: 'sync.state', path: ref.path }, ref.device).catch(() => undefined)
    if (state) states.set(keyOf(ref), state)
    else states.delete(keyOf(ref))
    ctx.emit('sync.change')
    return state
  }

  const refreshAll = (refs: ProjectRef[]) => Promise.all(refs.map(refresh)).then(() => undefined)

  const refreshLists = (refs: ProjectRef[]) => Promise.all(refs.map(ref => projects.refresh(ref.device ?? thisDevice)))

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
    inspect: ref => call<SyncInspect>({ type: 'sync.inspect', path: ref.path }, ref.device),
    async copy(from, to, options, progress) {
      await copyProject(call, from, to, { setup: options?.setup }, progress)
      await refreshLists([from, to])
      await refreshAll([from, to])
    },
    async send(from, to, progress): Promise<SyncApplied> {
      const applied = await sendProject(call, from, to, progress)
      await refreshAll([from, to])
      return applied
    },
    async resolve(ref, picks: Record<string, SyncPick>) {
      const resolved = await call<SyncResolved>({ type: 'sync.resolve', path: ref.path, picks }, ref.device)
      await refresh(ref)
      return resolved
    },
    setup: (ref, command) => call<SyncSetup>({ type: 'sync.setup', path: ref.path, command }, ref.device),
  }
}
