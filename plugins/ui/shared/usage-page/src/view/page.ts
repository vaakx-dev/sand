import { delayed, derive, div, dynamicChild, settingsRow, settingsSection, show, spinner } from '@sand/dom'
import type { Merged } from '../data/types'
import { usageModel, type UsageDeps, type UsageModel } from '../model'
import { accountsView } from './accounts'
import { breakdownView } from './breakdown'
import { chartView } from './chart'
import { headline } from './headline'
import { offlineNotices, unpricedNotes } from './notices'
import { toolbar } from './toolbar'

type BodyState = Merged | 'waiting' | 'empty' | 'missing'

const noUsage = () => settingsSection({}, settingsRow('No usage in this range'))

const pending = () => div({ class: 'flex h-24 items-center justify-center text-neutral-500' }, show(delayed(true), () => spinner(16)))

const content = (usage: Merged, model: UsageModel) => {
  const accounts = accountsView(usage.accounts, { now: model.now, nameOf: model.nameOf, checking: model.checking, check: model.checkLimits })
  if (!usage.total.turns) return div({ class: 'flex flex-col gap-10' }, accounts, noUsage())
  return div(
    { class: 'flex flex-col gap-10' },
    headline(usage),
    accounts,
    chartView(usage, model.metric),
    div(
      { class: 'flex flex-col gap-4' },
      breakdownView({ usage, nameOf: model.nameOf, openThread: model.openThread, copy: model.copy, showOnly: model.showOnly }, model.breakdown),
      unpricedNotes(usage.unpriced),
    ),
  )
}

const stateOf = (model: UsageModel): BodyState => {
  const usage = model.usage.get()
  if (usage) return usage
  if (model.busy.get()) return 'waiting'
  return model.notices.get().length ? 'missing' : 'empty'
}

const bodyOf = (state: BodyState, model: UsageModel) => {
  if (typeof state === 'object') return content(state, model)
  if (state === 'waiting') return pending()
  return state === 'empty' ? noUsage() : null
}

export const usagePage = (deps: UsageDeps) => {
  const model = usageModel(deps)
  return div(
    { class: 'flex w-full flex-col gap-8' },
    toolbar(model),
    dynamicChild(model.notices, notices => offlineNotices(notices, model.now)),
    div(
      { class: ['transition', () => (model.busy.get() && model.usage.get() ? 'opacity-75' : '')] },
      dynamicChild(
        derive(() => stateOf(model)),
        state => bodyOf(state, model),
      ),
    ),
  )
}
