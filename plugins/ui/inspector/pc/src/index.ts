import { inspector } from '@sand/inspector/contract'
import { pcs, pcsChange } from '@sand/devices-contract'
import { pulse } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'inspector-pc',
  description: 'The details card\'s PC row: the PC a thread runs on and its folder',
  inject: { inspector, kit, pcs },
  apply(ctx) {
    const changes = pulse(ctx, [pcsChange])
    const name = (device: string) => {
      changes.version.get()
      return ctx.pcs.name(device)
    }
    ctx.effect(() =>
      ctx.inspector.row({
        id: 'pc',
        group: 'place',
        order: 10,
        shows: () => true,
        render: subject => {
          const folder = () => tildeHome(subject().cwd ?? '')
          return ctx.kit.cardItem({ lead: ctx.kit.icon('monitor', 'sm'), end: folder, title: folder }, () => name(subject().device))
        },
      }),
    )
  },
})
