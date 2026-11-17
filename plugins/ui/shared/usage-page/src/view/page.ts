import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import { usageModel, type UsageDeps, type UsageModel } from '../model'
import { forecastSection } from './forecast'
import { plansSection } from './plans'
import { spendSection } from './spend'
import { toolbar } from './toolbar'

type BodyState = 'ready' | 'waiting' | 'empty' | 'missing'

const stateOf = (model: UsageModel): BodyState => {
  if (model.usage.get()) return 'ready'
  if (model.busy.get()) return 'waiting'
  return model.notices.get().length ? 'missing' : 'empty'
}

const poolSections = (kit: Kit, model: UsageModel) =>
  div({ class: 'flex flex-col gap-10' }, forecastSection({ kit, gauges: model.gauges, chosen: model.forecast }), plansSection(kit, { gauges: model.gauges, now: model.now }))

const sections = (kit: Kit, model: UsageModel) => div({ class: 'flex flex-col gap-10' }, poolSections(kit, model), spendSection(kit, model))

const bodyOf = (kit: Kit, state: BodyState, model: UsageModel) => {
  if (state === 'ready') return sections(kit, model)
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
