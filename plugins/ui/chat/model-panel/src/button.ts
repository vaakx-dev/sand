import type { Pulse } from '@sand/reactive'
import { div, dynamicChild, onMount, show, sig, SPACE, span } from '@vaakx-dev/vrui'
import type { PanelContext } from './context'
import type { ModelButton, ModelTarget } from './contract'
import { pickerTarget } from './target'

const panelWidth = `min(calc(${SPACE['96']} + ${SPACE['12']}), 100%)`

const buttonView = (ctx: PanelContext, changes: Pulse, target: ModelTarget, mounted: (open: () => void) => () => void) => {
  const { chipPopover, metaLine, pressOpens, quietButton } = ctx.kit
  const open = sig(false)
  const close = () => open.set(false)
  const picker = pickerTarget(ctx, changes, target)

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

  const node = div(
    { class: 'flex min-w-0 items-center' },
    quietButton(
      { surface: 'raised', active: open, title: tip, class: 'min-w-0 shrink px-2', ...pressOpens(open, () => open.update(value => !value)) },
      dynamicChild(chosen, picked => (picked ? metaLine(label) : span({ class: 'min-w-0 truncate text-xs text-warning-400' }, label))),
    ),
    show(open, () => chipPopover(close, { class: 'right-0', width: panelWidth }, ctx.modelPicker.panel(picker, close))),
  )
  onMount(node, () => mounted(() => open.set(true)))
  return node
}

export const modelButton = (ctx: PanelContext, changes: Pulse): ModelButton => {
  const live: (() => void)[] = []
  const mounted = (open: () => void) => {
    live.push(open)
    return () => {
      live.splice(live.indexOf(open), 1)
    }
  }
  return {
    view: target => buttonView(ctx, changes, target, mounted),
    open: () => live.at(-1)?.(),
  }
}
