import type { Settings } from './contract'
import { icon, layer, mount, pulse, secondaryAction } from '@sand/dom'
import { definePlugin, type Dispose } from 'drydock'
import { leavePage, openPage, switchPage } from './address'
import { cover } from './cover'
import { followAddress } from './follow'
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
    let uncover: Dispose | undefined

    const hide = () => {
      void uncover?.()
      uncover = undefined
    }

    const choose = (id: string) => settings.open(id)
    const close = () => settings.close()
    const showPages = () => ctx.layout?.toggle('side', true)

    const render = () => {
      hide()
      if (!store.current.get()) return
      uncover = cover(
        ctx.layout,
        () => sideView({ store, narrow, choose, back: close }),
        () => pageView({ store, narrow, showPages, close }),
      )
    }

    const show = (id: string | undefined) => {
      const before = store.current.get()
      if (before === id) return
      store.show(id)
      if (!before || !id) render()
      ctx.emit('settings.change', id)
    }

    const go = (id: string | undefined) => {
      const before = store.current.get()
      if (before === id) return
      if (!id) leavePage()
      else if (before) switchPage(id)
      else openPage(id)
      show(id)
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
      section: section => store.addSection(section),
      pages: () => store.pages.get(),
      open: id => go(store.pick(id)?.id),
      close: () => go(undefined),
      current: () => store.current.get(),
    }

    const restore = followAddress(ctx, settings.pages, show)
    const toggle = () => (store.current.get() ? settings.close() : settings.open())
    const floatingButton = () =>
      mount(
        document.body,
        secondaryAction(
          { size: 'sm', class: [layer.drawer, 'fixed bottom-3 left-3 opacity-75'], onClick: toggle },
          icon('gear', 12),
          'Settings',
        ),
      )

    ctx.provide('settings', settings)
    ctx.watch('layout', () => {
      render()
      return hide
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
