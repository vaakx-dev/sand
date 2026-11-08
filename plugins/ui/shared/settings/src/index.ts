import { owned, pulse } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { derive, effect, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { settings, settingsChange, type Settings } from './contract'
import { pageStore } from './pages'
import { settingsScreen } from './screen'

const kind = 'settings'

export default definePlugin({
  name: 'settings',
  description: 'Settings: a sidebar item that opens the settings pages, listed beside the chosen one',
  inject: { kit },
  apply(ctx) {
    const store = pageStore()
    const found = pulse(ctx, [], [shell])
    const at = found.read(() => {
      const frame = ctx.get(shell)
      const route = frame?.current()
      return frame && route?.kind === kind ? { id: route.id, phone: frame.state() === 'phone' } : undefined
    })
    const current = owned(ctx, () =>
      derive(() => {
        const shown = at.get()
        if (!shown || (shown.phone && !shown.id)) return undefined
        return store.pick(shown.id)?.id
      }),
    )

    const host: Settings = {
      page: page => store.add(page),
      section: section => store.addSection(section),
      pages: () => store.pages.get(),
      open(id) {
        const page = id ? store.pick(id)?.id : undefined
        const replace = Boolean(at.get() && !at.get()?.phone)
        ctx.get(shell)?.open({ kind, ...(page && { id: page }) }, { replace })
      },
      close() {
        if (at.get()) ctx.get(shell)?.back()
      },
      current: () => current.get(),
    }

    owned(ctx, () =>
      effect(() => {
        const id = current.get()
        untrack(() => {
          if (id) store.remember(id)
          ctx.emit(settingsChange, id)
        })
      }),
    )
    ctx.provide(settings, host)

    const dot = () => store.pages.get().some(page => page.dot?.())
    ctx.watch(shell, frame => {
      if (!frame) return
      const stops = [
        frame.nav({ id: 'settings', label: 'Settings', icon: 'gear', order: 100, place: 'foot', dot, to: { kind } }),
        frame.route({ kind, render: route => settingsScreen(ctx.kit, { store, shell: frame, choose: host.open }, route) }),
      ]
      return () => {
        for (const stop of stops) void stop()
      }
    })
  },
})
