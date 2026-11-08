import { pcs, wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { limits, limitsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/reactive'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { pcList } from './pcs'
import { usagePage } from './view/page'

const kind = 'usage'

export default definePlugin({
  name: 'usage-page',
  description: 'Usage page, opened from the sidebar foot: plan limits, billed cost and tokens per account, across your PCs',
  inject: { wire, kit, pcs },
  apply(ctx) {
    const changes = pulse(ctx, [limitsChange], [limits])
    const pcViews = pcList(ctx)

    const render = () =>
      usagePage(ctx.kit, {
        wire: ctx.wire,
        pcs: pcViews,
        limits: () => {
          changes.version.get()
          return ctx.get(limits)?.all() ?? []
        },
        refreshLimits: () => ctx.get(limits)?.refresh().catch(() => {}) ?? Promise.resolve(),
      })
    ctx.watch(shell, frame =>
      frame
        ? joinDisposers(
            frame.nav({ id: 'usage', label: 'Usage', icon: 'chart', order: 150, place: 'foot', to: { kind } }),
            frame.route({ kind, render: () => ({ head: () => 'Usage', main: () => ctx.kit.pageBody({}, render()) }) }),
          )
        : undefined,
    )
  },
})
