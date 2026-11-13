import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import type { Merged } from '../data/types'
import { usageModel, type UsageDeps, type UsageModel } from '../model'
import { forecastSection } from './forecast'
import { plansSection } from './plans'
import { spendSection } from './spend'
import { toolbar } from './toolbar'

type BodyState = Merged | 'waiting' | 'empty' | 'missing'

const stateOf = (model: UsageModel): BodyState => {
  const usage = model.usage.get()
  if (usage) return usage
  if (model.busy.get()) return 'waiting'
  return model.notices.get().length ? 'missing' : 'empty'
}

const sections = (kit: Kit, usage: Merged, model: UsageModel) =>
  div(
    { class: 'flex flex-col gap-10' },
    forecastSection(usage.accounts, { kit, now: model.now, history: model.history, chosen: model.forecast }),
    plansSection(usage.accounts, { kit, now: model.now, history: model.history }),
    spendSection(kit, usage, model),
  )

const bodyOf = (kit: Kit, state: BodyState, model: UsageModel) => {
  if (typeof state === 'object') return sections(kit, state, model)
  if (state === 'waiting') return kit.loadingState()
  return state === 'empty' ? kit.emptyState({ text: 'No usage yet.' }) : null
}

export const usagePage = (kit: Kit, deps: UsageDeps) => {
  const model = usageModel(deps)
  return div(
    { class: 'flex w-full flex-col gap-8' },
    toolbar(kit, model),
    div(
      { class: ['transition', () => (model.busy.get() && model.usage.get() ? 'opacity-75' : '')] },
      dynamicChild(
        derive(() => stateOf(model)),
        state => bodyOf(kit, state, model),
      ),
    ),
  )
}
