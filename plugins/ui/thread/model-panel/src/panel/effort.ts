import type { EffortLevel, ModelInfo } from '@sand/llm-accounts/contract'
import { segmented, type Sig } from '@sand/dom'
import type { Actions } from '../actions'
import type { Choice } from './scene'

export const effortBar = (choice: Choice, levels: EffortLevel[], model: ModelInfo | undefined, flash: Sig<boolean>, actions: Actions) =>
  segmented(
    levels.map(level => ({
      value: level.id,
      label: level.label,
      disabled: !choice.shown.supportsEffort || !model?.efforts.includes(level.id),
      ...(level.id === model?.defaultEffort && { title: `${level.label} is the model default` }),
    })),
    choice.shown.effort,
    effort => actions.set({ effort }),
    { label: 'Effort', inset: true, fill: true, class: ['mx-1 mt-2', () => flash.get() && 'ring-2 ring-accent-500'] },
  )
