import { pcs, wire } from '@sand/devices-contract'
import { rail } from '@sand/rail/contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { limits, limitsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/reactive'
import { definePlugin } from 'drydock'
import { pcList } from './pcs'
import { usagePage } from './view/page'

export default definePlugin({
  name: 'usage-page',
  description: 'Usage page in settings: plan limits, billed cost and tokens per account, across your PCs',
  inject: { wire, kit, pcs },
  apply(ctx) {
    const changes = pulse(ctx, [limitsChange], [limits])
    const pcViews = pcList(ctx)

    ctx.watch(settings, pages => {
      if (!pages) return
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
      const page = pages.page({ id: 'usage', label: 'Usage', icon: 'chart', order: 60, render })
      const action = ctx.watch(rail, found => found?.action({ id: 'usage', label: 'Usage', icon: 'chart', order: 100, within: 'settings', current: () => pages.current() === 'usage', run: () => pages.open('usage') }))
      return () => {
        void page()
        void action()
      }
    })
  },
})
