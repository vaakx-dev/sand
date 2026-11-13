import { wire } from '@sand/devices-contract'
import { inspector } from '@sand/inspector/contract'
import { wireValues } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { type ThreadUsage, usageThread, usageThreadChange } from '@sand/usage/contract'
import { clock, derive, dynamicChild } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { usageCard } from './card'

const MINUTE = 60_000

export default definePlugin({
  name: 'inspector-usage',
  description: "The inspector's usage row: what a thread and its subagents cost per model, and the plan limits of the account it runs on",
  inject: { inspector, kit, wire },
  apply(ctx) {
    const usageOf = wireValues(ctx, ctx.wire, {
      key: ({ session }: Subject) => session,
      read: ({ session, device }: Subject) => ctx.wire.call(usageThread, { session }, device),
      change: usageThreadChange,
      changed: (usage): [string, ThreadUsage] => [usage.session, usage],
    })
    const now = clock(MINUTE)

    ctx.effect(() =>
      ctx.inspector.row({
        id: 'usage',
        group: 'usage',
        order: 80,
        shows: subject => subject.owner === 'thread' && (usageOf(subject)?.total.turns ?? 0) > 0,
        render: subject => dynamicChild(derive(() => usageOf(subject())), usage => (usage ? usageCard(ctx.kit, usage, now) : null)),
      }),
    )
  },
})
