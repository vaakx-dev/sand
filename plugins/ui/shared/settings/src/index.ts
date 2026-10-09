import type { Settings } from './contract'
import { closeDrawer, float, icon, layer, pulse, secondaryAction } from '@sand/dom'
import { definePlugin, type Dispose } from 'drydock'
import { showPage } from './address'
import { cover } from './cover'
import { followThreads } from './follow'
import { pageView } from './page'
import { pageStore } from './pages'
import { sideView } from './side'

export default definePlugin({
  name: 'settings',
  description: 'Settings: the sidebar lists the settings pages and the main column shows the chosen one',
  uses: {
    layout: 'settings cover the whole window',
    nav: 'no Settings button in the sidebar',
    commands: 'no /settings command',
  },
  apply(ctx) {
    const store = pageStore()
    const narrow = pulse(ctx, ['layout.change'], ['layout']).read(() => ctx.layout?.state().narrow ?? false)
    let hide: Dispose | undefined

    const unshow = () => {
      void hide?.()
      hide = undefined
    }

    const choose = (id: string) => {
      settings.open(id)
      closeDrawer(ctx)
    }
    const close = () => settings.close()
    const showPages = () => ctx.layout?.toggle('side', true)

    const render = () => {
      unshow()
      if (!store.current.get()) return
      hide = cover(
        ctx.layout,
        () => sideView({ store, narrow, choose, back: close }),
        () => pageView({ store, narrow, showPages, close }),
      )
    }

    const go = (id: string | undefined) => {
      const before = store.current.get()
      if (before === id) return
      store.show(id)
      showPage(id)
      if (!before || !id) render()
      ctx.emit('settings.change', id)
    }

    const settings: Settings = {
      page(page) {
        const remove = store.add(page)
        restore()
        return () => {
          remove()
          if (store.current.get() === page.id) go(store.pick()?.id)
        }
      },
      pages: () => store.pages.get(),
      open: id => go(store.pick(id)?.id),
      close: () => go(undefined),
      current: () => store.current.get(),
    }

    const restore = followThreads(ctx, settings.pages, settings.open, close)
    const toggle = () => (store.current.get() ? settings.close() : settings.open())
    const floatingButton = () =>
      float(
        secondaryAction(
          { size: 'sm', class: [layer.drawer, 'fixed opacity-75'], style: { left: '0.75rem', bottom: '0.75rem' }, onClick: toggle },
          icon('gear', 12),
          'Settings',
        ),
      )

    ctx.provide('settings', settings)
    ctx.watch('layout', () => {
      render()
      return unshow
    })
    ctx.watch('nav', nav =>
      nav
        ? nav.action({ id: 'settings', label: 'Settings', icon: 'gear', place: 'footer', order: 100, run: toggle })
        : ctx.watch('commands', commands => (commands ? undefined : floatingButton())),
    )
    ctx.watch('commands', commands =>
      commands?.add({ name: 'settings', description: 'Open settings', args: '[page]', run: args => settings.open(args.trim() || undefined) }),
    )
  },
})
