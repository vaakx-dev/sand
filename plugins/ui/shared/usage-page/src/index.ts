import { pcs, wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { shell, type Shell } from '@sand/ui-shell/contract'
import { limits, limitsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/reactive'
import { joinDisposers } from '@sand/util'
import { derive, div, dynamicChild, sig, span } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { type UsageView, usageViews } from './contract'
import { pcList } from './pcs'
import { usagePage } from './view/page'

const kind = 'usage'
const label = 'Usage'

export default definePlugin({
  name: 'usage-page',
  description: 'Usage page, opened from the sidebar foot: a forecast of the plan limit that runs out first, every limit per account, and daily cost by model, beside the other views added to it, like Performance',
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

    const usage: UsageView = { id: kind, label, order: 0, render: () => ctx.kit.pageBody({}, render()) }
    const views = sig<UsageView[]>([usage])
    ctx.provide(usageViews, {
      add(view) {
        views.set([...views.get(), view].toSorted((first, second) => first.order - second.order))
        return () => views.set(views.get().filter(shown => shown !== view))
      },
    })

    const switcher = (frame: Shell, chosen: () => string) =>
      dynamicChild(views, all =>
        all.length < 2
          ? span(label)
          : ctx.kit.segmented(
              all.map(view => ({ value: view.id, label: view.label })),
              chosen,
              id => frame.open({ kind, ...(id !== kind && { id }) }, { replace: true }),
              { label: 'Usage views' },
            ),
      )

    ctx.watch(shell, frame =>
      frame
        ? joinDisposers(
            frame.nav({ id: 'usage', label, icon: 'chart', order: 150, place: 'foot', to: { kind } }),
            frame.route({
              kind,
              render: route => {
                const chosen = () => route().id ?? kind
                const view = derive(() => views.get().find(shown => shown.id === chosen()) ?? usage)
                return {
                  head: () => switcher(frame, chosen),
                  column: true,
                  main: () => div({ class: 'flex min-h-0 min-w-0 flex-1 flex-col' }, dynamicChild(view, shown => shown.render())),
                }
              },
            }),
          )
        : undefined,
    )
  },
})
