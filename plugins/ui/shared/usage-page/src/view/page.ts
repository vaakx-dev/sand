import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import type { Merged } from '../data/types'
import { usageModel, type UsageDeps, type UsageModel } from '../model'
import { forecastSection } from './forecast'
import { type Opened, plansSection } from './plans'
import { spendSection } from './spend'
import { toolbar } from './toolbar'

type BodyState = Merged | 'waiting' | 'empty' | 'missing'

const stateOf = (model: UsageModel): BodyState => {
  const usage = model.usage.get()
  if (usage) return usage
  if (model.busy.get()) return 'waiting'
  return model.notices.get().length ? 'missing' : 'empty'
}

const poolSections = (kit: Kit, model: UsageModel, opened: Opened) =>
  dynamicChild(
    derive(() => ({ gauges: model.gauges.get(), now: model.now.get(), chosen: model.forecast.get() })),
    ({ gauges, now }) =>
      div({ class: 'flex flex-col gap-10' }, forecastSection({ kit, gauges, now, chosen: model.forecast }), plansSection(kit, gauges, now, opened)),
  )

const sections = (kit: Kit, usage: Merged, model: UsageModel, opened: Opened) => div({ class: 'flex flex-col gap-10' }, poolSections(kit, model, opened), spendSection(kit, usage, model))

const bodyOf = (kit: Kit, state: BodyState, model: UsageModel, opened: Opened) => {
  if (typeof state === 'object') return sections(kit, state, model, opened)
  if (state === 'waiting') return kit.loadingState()
  return state === 'empty' ? kit.emptyState({ text: 'No usage yet.' }) : null
}

export const usagePage = (kit: Kit, deps: UsageDeps) => {
  const model = usageModel(deps)
  const opened: Opened = new Map()
  return div(
    { class: 'flex w-full flex-col gap-8' },
    toolbar(kit, model),
    div(
      { class: ['transition', () => (model.busy.get() && model.usage.get() ? 'opacity-75' : '')] },
      dynamicChild(
        derive(() => stateOf(model)),
        state => bodyOf(kit, state, model, opened),
      ),
    ),
  )
}
