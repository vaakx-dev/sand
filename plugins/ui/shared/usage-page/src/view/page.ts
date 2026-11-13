import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import type { Merged } from '../data/types'
import type { Metric } from '../format'
import { usageModel, type UsageDeps, type UsageModel } from '../model'
import { breakdownView } from './breakdown'
import { unpricedNote } from './notices'
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

const sections = (kit: Kit, usage: Merged, model: UsageModel, metric: Metric) =>
  div(
    { class: 'flex flex-col gap-10' },
    plansSection(usage.accounts, { kit, now: model.now, history: model.history }),
    spendSection(kit, usage, model, metric),
    usage.total.turns ? breakdownView({ kit, usage, nameOf: model.nameOf }, model.breakdown, metric) : null,
    metric === 'cost' && usage.unpriced.length ? div({ class: 'flex flex-col gap-2' }, usage.unpriced.map(item => unpricedNote(kit, item))) : null,
  )

const bodyOf = (kit: Kit, state: BodyState, model: UsageModel, metric: Metric) => {
  if (typeof state === 'object') return sections(kit, state, model, metric)
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
        derive(() => ({ state: stateOf(model), metric: model.metric.get() })),
        ({ state, metric }) => bodyOf(kit, state, model, metric),
      ),
    ),
  )
}
