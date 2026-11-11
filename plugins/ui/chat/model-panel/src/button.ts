import type { Pulse } from '@sand/reactive'
import { derive, div, dynamicChild, media, onMount, sig, SPACE, span } from '@vaakx-dev/vrui'
import type { PanelContext } from './context'
import type { ModelButton, ModelTarget } from './contract'
import { pickerTarget } from './target'

const popoverWidth = `calc(${SPACE['96']} + ${SPACE['12']})`

type Placement = 'popover' | 'inline'

const rowView = (ctx: PanelContext, changes: Pulse, target: ModelTarget, opened: boolean, mounted: (open: () => void) => () => void) => {
  const { cardItem, chipPopover, modelLogo, pressOpens } = ctx.kit
  const open = sig(opened)
  const close = () => open.set(false)
  const picker = pickerTarget(ctx, changes, target)
  const phone = media('(max-width: 37.5rem)')

  const current = changes.read(() => ctx.modelPicker.resolve(target.settings()))
  const model = changes.read(() => ctx.models.info(current.get().model))
  const source = changes.read(() => ctx.models.sources().find(known => known.id === model.get()?.source))
  const chosen = current.map(value => Boolean(value.model))
  const modelLabel = () => model.get()?.label ?? current.get().model ?? 'Choose a model'
  const effortLabel = () => ctx.models.levels().find(level => level.id === current.get().effort)?.label ?? ''
  const fast = () => current.get().speed === 'fast'
  const label = () => [modelLabel(), effortLabel(), fast() && 'Fast'].filter(Boolean).join(' · ')
  const offline = () => {
    const pc = source.get()?.pc
    return pc ? ctx.modelPicker.online(pc) === false : false
  }
  const tip = () => [modelLabel(), offline() && 'offline', effortLabel() && `${effortLabel()} effort`, fast() && 'Fast mode'].filter(Boolean).join(' · ')

  const placements: Record<Placement, () => HTMLElement> = {
    popover: () => chipPopover(close, { class: 'top-full right-0 mt-1', width: popoverWidth }, ctx.modelPicker.panel(picker, close)),
    inline: () => div({ class: 'flex min-w-0 flex-col px-1 pb-1' }, ctx.modelPicker.panel(picker, close)),
  }
  const placement = derive<Placement | undefined>(() => {
    if (!open.get()) return undefined
    return phone.get() ? 'inline' : 'popover'
  })

  const node = div(
    { class: 'relative flex min-w-0 flex-col' },
    cardItem(
      { title: tip, 'aria-label': tip, lead: dynamicChild(
          model.map(value => value?.provider),
          provider => modelLogo(provider, 16),
        ), menu: true, ...pressOpens(open, () => open.update(value => !value)) },
      span({ class: () => (chosen.get() ? '' : 'text-warning-400') }, label),
    ),
    dynamicChild(placement, place => (place ? placements[place]() : null)),
  )
  onMount(node, () => mounted(() => open.set(true)))
  return node
}

const added = <T>(all: T[], item: T) => {
  all.push(item)
  return () => {
    all.splice(all.indexOf(item), 1)
  }
}

export const modelButton = (ctx: PanelContext, changes: Pulse): ModelButton => {
  const live: (() => void)[] = []
  const reveals: (() => void)[] = []
  let wanted = false
  return {
    view(target) {
      const node = rowView(ctx, changes, target, wanted, open => added(live, open))
      wanted = false
      return node
    },
    open() {
      const last = live.at(-1)
      if (last) {
        last()
        return true
      }
      wanted = true
      for (const show of reveals) show()
      const shown = !wanted
      wanted = false
      return shown
    },
    reveal: show => added(reveals, show),
  }
}
