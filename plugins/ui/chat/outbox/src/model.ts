import { type Pcs, pcsChange, type ThreadPcs, type Wire } from '@sand/devices-contract'
import { pulse } from '@sand/reactive'
import { type Outbox, outboxChange, threadSelect, threadsChange } from '@sand/web-client/contract'
import { derive } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export interface OutboxParts {
  outbox: Outbox
  wire: Wire
  pcs: Pcs
  threadPcs: ThreadPcs
}

export const outboxModel = (ctx: Context, { outbox, wire, pcs, threadPcs }: OutboxParts) => {
  const changes = pulse(ctx, [outboxChange, pcsChange, threadSelect, threadsChange])
  const pc = changes.read(() => threadPcs.current() ?? pcs.here().id)
  const items = changes.read(() => outbox.list(pc.get()))
  const busy = changes.read(() => new Set(items.get().flatMap(item => (outbox.sending(item.id) ? [item.id] : []))))
  const ready = changes.read(() => wire.ready(pc.get()))
  const name = changes.read(() => pcs.name(pc.get()))
  const waiting = derive(() => items.get().length > 0)
  return { outbox, items, busy, ready, name, waiting }
}

export type OutboxModel = ReturnType<typeof outboxModel>
