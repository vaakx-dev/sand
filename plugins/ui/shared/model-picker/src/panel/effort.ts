import { div, span } from '@vaakx-dev/vrui'
import type { PickerContext } from '../deps'
import type { Scene } from './scene'

const focusChosen = (node: HTMLElement) => node.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()

export const effortBar = (ctx: PickerContext, { shown, target }: Scene, flash: boolean) => {
  const { segmented } = ctx.kit
  const model = ctx.models.info(shown.model)
  const bar = segmented(
    ctx.models.levels().map(level => ({
      value: level.id,
      label: level.label,
      disabled: !shown.supportsEffort || !model?.efforts.includes(level.id),
      ...(level.id === model?.defaultEffort && { title: `${level.label} is the model default` }),
    })),
    shown.effort,
    effort => target.set({ effort }),
    { label: 'Effort', inset: true, fill: true },
  )
  return div({ class: 'mt-2 flex flex-col', onMount: node => (flash ? focusChosen(node) : undefined) }, bar)
}

export const fastRow = ({ kit, shown, target }: Scene) => {
  const { settingsRow, toggleSwitch } = kit
  const on = shown.speed === 'fast'
  return settingsRow(
    { title: span({ class: shown.supportsFast ? '' : 'text-neutral-500' }, 'Fast mode'), class: 'px-2' },
    toggleSwitch({ on, disabled: !shown.supportsFast, 'aria-label': 'Fast mode', onClick: () => target.set({ speed: on ? 'normal' : 'fast' }) }),
  )
}
