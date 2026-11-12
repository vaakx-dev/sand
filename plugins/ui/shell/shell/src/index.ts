import { owned } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import { onAddressChange } from '@sand/web-client/contract'
import { byId, div, dynamicChild, effect, list, mount, resizeObserver, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { chipBar } from './chips'
import { shell, shellChange, type Shell } from './contract'
import { deskView } from './desk'
import { swipeGesture } from './integrations/touch'
import { shellModel, type Model, type Placed } from './model'
import { sheetHost } from './sheet'
import { phoneView } from './phone'
import { edgeSwipe } from './swipes'
import { fitArea, keyboardArea } from './viewport'
import type { Registry } from './registry'

const placed = (places: Registry<Placed>, into: HTMLElement) =>
  list(
    places.items,
    entry => entry.view,
    entry => entry.get().view,
    into,
  )

const shellView = (model: Model) => {
  const keyboard = keyboardArea()
  return div(
    {
      class: 'absolute inset-0 flex flex-col bg-neutral-900 px-safe pt-safe pb-safe',
      style: () => ({ overflow: 'clip', ...fitArea(keyboard.get()) }),
      onMount: node => {
        resizeObserver(node, ([entry]) => {
          if (!entry) return
          model.width.set(entry.contentRect.width)
          model.height.set(entry.contentRect.height)
        })
      },
    },
    placed(model.places.top, div({ class: 'flex shrink-0 flex-col' })),
    dynamicChild(model.phone, phone => (phone ? phoneView(model) : deskView(model))),
    sheetHost(model),
    placed(model.places.overlay, div({ class: 'contents' })),
  )
}

export default definePlugin({
  name: 'shell',
  description: "The app's frame: sidebar, screens and their routes, phone covers, sheets and the chips above composers",
  inject: { kit },
  apply(ctx) {
    const model = owned(ctx, () => shellModel(ctx.kit))

    owned(ctx, () => {
      effect(() => {
        const alive = model.alive.get()
        untrack(() => model.screens.keep(alive))
      })
      effect(() => {
        const state = model.state.get()
        const route = model.current.get()
        untrack(() => ctx.emit(shellChange, state, route))
      })
      swipeGesture(ctx.kit, way => edgeSwipe(model, way))
    })
    ctx.effect(() => onAddressChange(() => model.follow()))
    ctx.effect(() => mount(byId('stage'), owned(ctx, () => shellView(model))))
    ctx.effect(() => () => model.screens.clear())

    const host: Shell = {
      nav: item => model.navs.add(item),
      section: section => model.sections.add(section),
      route: spec => model.routes.add(spec),
      open: (route, options) => model.open(route, options?.replace),
      back: () => model.back(),
      current: () => model.current.get(),
      state: () => model.state.get(),
      sheet(spec) {
        model.showSheet(spec)
        return { close: () => model.closeSheet(spec) }
      },
      cover: close => model.cover(close),
      aside: spec => model.asides.add(spec),
      showAside: (id, open) => model.showAside(id, open),
      subject: source => model.addSubject(source),
      subjectOf: route => model.subjectOf(route),
      chip: source => model.chips.add(source),
      chipBar: scope => chipBar(ctx.kit, model.chips.items, scope),
      mount: (where, view, order = 0) => model.places[where].add({ view, order }),
      swipe: way => edgeSwipe(model, way),
    }
    ctx.provide(shell, host)
  },
})
