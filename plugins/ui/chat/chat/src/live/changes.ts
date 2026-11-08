import { changesChange, changesList, type ThreadChanges } from '@sand/changes/contract'
import { pcHello, pcs, wire, type Wire } from '@sand/devices-contract'
import { featureState } from '@sand/features/contract'
import { joinDisposers } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { ChatContext } from '../context'

type Keep = (list: ThreadChanges[]) => void

const follow = (ctx: ChatContext, link: Wire, keep: Keep): Dispose => {
  const load = (pc: string) => void link.call(changesList, {}, pc).then(keep, () => undefined)
  for (const pc of ctx.get(pcs)?.list() ?? []) if (link.ready(pc.id)) load(pc.id)
  return joinDisposers(
    ctx.on(pcHello, load),
    link.on(changesChange, changes => keep([changes]), { from: 'all' }),
  )
}

export const threadChanges = (ctx: ChatContext) => {
  const known = sig<ReadonlyMap<string, ThreadChanges>>(new Map())
  const keep: Keep = list => known.update(current => new Map([...current, ...list.map(changes => [changes.session, changes] as const)]))
  ctx.watch(featureState, features => {
    known.set(new Map())
    if (features?.on('merge')) return ctx.watch(wire, link => link && follow(ctx, link, keep))
  })
  return (thread: string) => known.get().get(thread)
}
