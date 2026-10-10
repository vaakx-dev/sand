import type { EffortLevel, ModelInfo } from '@sand/llm-accounts/contract'
import { div, segmented, span, toggleSwitch } from '@sand/dom'
import type { Picked, PickerTarget } from '../contract'

export const effortBar = (shown: Picked, levels: EffortLevel[], model: ModelInfo | undefined, flash: boolean, target: PickerTarget) =>
  segmented(
    levels.map(level => ({
      value: level.id,
      label: level.label,
      disabled: !shown.supportsEffort || !model?.efforts.includes(level.id),
      ...(level.id === model?.defaultEffort && { title: `${level.label} is the model default` }),
    })),
    shown.effort,
    effort => target.set({ effort }),
    { label: 'Effort', inset: true, fill: true, class: ['mx-1 mt-2', flash && 'ring-2 ring-accent-500'] },
  )

export const fastRow = (shown: Picked, target: PickerTarget) => {
  const on = shown.speed === 'fast'
  return div(
    { class: 'mx-1 mt-1 flex items-center gap-3 rounded-lg px-3 py-2' },
    span({ class: ['min-w-0 flex-1 text-sm font-medium', shown.supportsFast ? 'text-neutral-300' : 'text-neutral-500'] }, 'Fast mode'),
    toggleSwitch({ on, disabled: !shown.supportsFast, 'aria-label': 'Fast mode', onClick: () => target.set({ speed: on ? 'normal' : 'fast' }) }),
  )
}
