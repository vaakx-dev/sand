import { wire } from '@sand/devices-contract'
import { inspector } from '@sand/inspector/contract'
import { wireValues } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import type { Subject } from '@sand/ui-shell/contract'
import type { ThreadUsage } from '@sand/usage/contract'
import { usageThread, usageThreadChange } from './contract'
import { derive, dynamicChild, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { usageCard } from './card'

export default definePlugin({
  name: 'inspector-usage',
  description: "The inspector's usage row: what a thread and its subagents cost, per model",
  inject: { inspector, kit, wire },
  apply(ctx) {
    const usageOf = wireValues(ctx, ctx.wire, {
      key: ({ session }: Subject) => session,
      read: ({ session, device }: Subject) => ctx.wire.call(usageThread, { session }, device),
      change: usageThreadChange,
      changed: (usage): [string, ThreadUsage] => [usage.session, usage],
    })

    ctx.effect(() =>
      ctx.inspector.row({
        id: 'usage',
        group: 'usage',
        order: 80,
        shows: subject => subject.owner === 'thread' && (usageOf(subject)?.total.turns ?? 0) > 0,
        render: subject => {
          const open = sig(false)
          return dynamicChild(derive(() => usageOf(subject())), usage => (usage ? usageCard(ctx.kit, usage, open) : null))
        },
      }),
    )
  },
})
