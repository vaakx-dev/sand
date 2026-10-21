import { layout, layoutChange } from '@sand/layout/contract'
import { running } from '@sand/layout/place'
import { nav, sidebar } from '@sand/nav/contract'
import { kit } from '@sand/ui-kit/contract'
import { pulse } from '@sand/web-client/reactive'
import { mount } from '@vaakx-dev/vrui'
import { definePlugin, type Dispose } from 'drydock'
import { leavePage, openPage, switchPage } from './address'
import { settings, settingsChange, type Settings } from './contract'
import { cover } from './cover'
import { followAddress } from './follow'
import { pageView } from './page'
import { pageStore } from './pages'
import { sideView } from './side'

export default definePlugin({
  name: 'settings',
  description: 'Settings: the sidebar lists the settings pages and the main column shows the chosen one',
  inject: { kit },
  apply(ctx) {
    const store = pageStore()
    const shell = pulse(ctx, [layoutChange], [layout])
    const narrow = shell.read(() => ctx.get(layout)?.state().narrow ?? false)
    let uncover: Dispose | undefined

    const hide = () => {
      void uncover?.()
      uncover = undefined
    }

    const choose = (id: string) => host.open(id)
    const close = () => host.close()
    const showPages = () => ctx.get(layout)?.toggle('side', true)

    const render = () => {
      hide()
      if (!store.current.get() || !running(ctx)) return
      const found = ctx.get(layout)
      uncover = cover(
        ctx.kit,
        found,
        () => sideView(ctx.kit, { store, narrow, choose, back: close, hide: found && (() => found.toggle('side', false)) }),
        () => pageView(ctx.kit, { store, narrow, showPages, choose, close }),
      )
    }

    const show = (id: string | undefined) => {
      const before = store.current.get()
      if (before === id) return
      store.show(id)
      if (!before || !id) render()
      ctx.emit(settingsChange, id)
    }

    const go = (id: string | undefined) => {
      const before = store.current.get()
      if (before === id) return
      if (!id) leavePage()
      else if (before) switchPage(id)
      else openPage(id)
      show(id)
    }

    const host: Settings = {
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

    const restore = followAddress(ctx, host.pages, show)
    const toggle = () => (store.current.get() ? host.close() : host.open())
    const floatingButton = () => {
      const { icon, layer, secondaryAction } = ctx.kit
      return mount(
        document.body,
        secondaryAction({ size: 'sm', class: [layer.drawer, 'fixed bottom-3 left-3 opacity-75'], onClick: toggle }, icon('gear', 14), 'Settings'),
      )
    }

    ctx.provide(settings, host)
    ctx.watch(layout, () => {
      render()
      return hide
    })
    ctx.watch(nav, found => found?.action({ id: 'settings', label: 'Settings', icon: 'gear', place: 'footer', order: 100, run: toggle }))
    ctx.watch(sidebar, found => (found ? undefined : floatingButton()))
  },
})
