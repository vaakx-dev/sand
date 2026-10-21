import { nav } from '@sand/nav/contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { limits, limitsChange, machines, wire } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import { definePlugin } from 'drydock'
import { pcList } from './pcs'
import { usagePage } from './view/page'

export default definePlugin({
  name: 'usage-page',
  description: 'Usage page in settings: plan limits, billed cost and tokens per account, across your PCs',
  inject: { wire, kit, machines },
  apply(ctx) {
    const changes = pulse(ctx, [limitsChange], [limits])
    const pcs = pcList(ctx)

    ctx.watch(settings, pages => {
      if (!pages) return
      const render = () =>
        usagePage(ctx.kit, {
          wire: ctx.wire,
          pcs,
          limits: () => {
            changes.version.get()
            return ctx.get(limits)?.all() ?? []
          },
          refreshLimits: () => ctx.get(limits)?.refresh().catch(() => {}) ?? Promise.resolve(),
        })
      const page = pages.page({ id: 'usage', label: 'Usage', icon: 'chart', order: 60, render })
      const action = ctx.watch(nav, found => found?.action({ id: 'usage', label: 'Usage', icon: 'chart', place: 'footer', order: 110, run: () => pages.open('usage') }))
      return () => {
        void page()
        void action()
      }
    })
  },
})
