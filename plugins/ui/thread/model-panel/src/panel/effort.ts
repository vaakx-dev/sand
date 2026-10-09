import type { EffortLevel, ModelInfo } from '@sand/protocol'
import { segmented, span, type Sig } from '@sand/dom'
import type { Actions } from '../actions'
import type { Choice } from './rows'

const defaultMark = () => span({ class: 'h-1 w-1 shrink-0 rounded-full bg-neutral-500' })

export const effortBar = (choice: Choice, levels: EffortLevel[], model: ModelInfo | undefined, flash: Sig<boolean>, actions: Actions) =>
  segmented(
    levels.map(level => {
      const standard = level.id === model?.defaultEffort
      return {
        value: level.id,
        label: level.label,
        disabled: !choice.shown.supportsEffort || !model?.efforts.includes(level.id),
        ...(standard && { title: `${level.label} is the model default`, mark: defaultMark() }),
      }
    }),
    choice.shown.effort,
    effort => actions.set({ effort }),
    { label: 'Effort', inset: true, fill: true, class: ['mx-1 mt-2', () => flash.get() && 'ring-2 ring-accent-500'] },
  )
