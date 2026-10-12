import { div, span } from '@vaakx-dev/vrui'
import type { PickerContext } from '../deps'
import type { Scene } from './scene'

export const effortBar = (ctx: PickerContext, { shown, target }: Scene, flash: boolean) => {
  const { segmented } = ctx.kit
  const model = ctx.models.info(shown.model)
  return segmented(
    ctx.models.levels().map(level => ({
      value: level.id,
      label: level.label,
      disabled: !shown.supportsEffort || !model?.efforts.includes(level.id),
      ...(level.id === model?.defaultEffort && { title: `${level.label} is the model default` }),
    })),
    shown.effort,
    effort => target.set({ effort }),
    { label: 'Effort', inset: true, fill: true, class: ['mx-1 mt-2', flash && 'ring-2 ring-accent-500'] },
  )
}

export const fastRow = ({ kit, shown, target }: Scene) => {
  const { toggleSwitch } = kit
  const on = shown.speed === 'fast'
  return div(
    { class: 'mx-1 mt-1 flex items-center gap-3 rounded-lg px-3 py-2' },
    span({ class: ['min-w-0 flex-1 text-sm font-medium', shown.supportsFast ? 'text-neutral-300' : 'text-neutral-500'] }, 'Fast mode'),
    toggleSwitch({ on, disabled: !shown.supportsFast, 'aria-label': 'Fast mode', onClick: () => target.set({ speed: on ? 'normal' : 'fast' }) }),
  )
}
