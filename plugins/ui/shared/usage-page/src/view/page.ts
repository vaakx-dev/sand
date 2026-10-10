import { delayed, derive, div, dynamicChild, settingsRow, settingsSection, show, span, spinner } from '@sand/dom'
import type { Merged } from '../data/types'
import { usageModel, type UsageDeps, type UsageModel } from '../model'
import { accountsView } from './accounts'
import { breakdownView } from './breakdown'
import { chartView } from './chart'
import { headline } from './headline'
import { offlineNotices, unpricedNotes } from './notices'
import { toolbar } from './toolbar'

const note = (text: string) => settingsSection({}, settingsRow(text))

const pending = () => div({ class: 'flex h-24 items-center justify-center text-neutral-500' }, show(delayed(true), () => spinner(16)))

const content = (usage: Merged, model: UsageModel) => {
  const used = usage.total.turns > 0
  return div(
    { class: 'flex flex-col gap-10' },
    used ? headline(usage) : null,
    accountsView(usage.accounts, { now: model.now, nameOf: model.nameOf, checking: model.checking, check: model.checkLimits }),
    used ? chartView(usage, model.metric) : note('No usage in this range'),
    used
      ? div(
          { class: 'flex flex-col gap-4' },
          breakdownView({ usage, nameOf: model.nameOf, openThread: model.openThread, copy: model.copy, showOnly: model.showOnly }, model.breakdown),
          unpricedNotes(usage.unpriced),
        )
      : null,
  )
}

const stateOf = (model: UsageModel) => model.usage.get() ?? (model.busy.get() ? 'waiting' : model.notices.get().length ? 'missing' : 'empty')

const body = (model: UsageModel) =>
  dynamicChild(derive(() => stateOf(model)), state =>
    typeof state === 'object' ? content(state, model) : state === 'waiting' ? pending() : state === 'empty' ? note('No usage in this range') : span(),
  )

export const usagePage = (deps: UsageDeps) => {
  const model = usageModel(deps)
  return div(
    { class: 'flex w-full flex-col gap-8' },
    toolbar(model),
    dynamicChild(model.notices, notices => offlineNotices(notices, model.now)),
    div({ class: ['transition', () => (model.busy.get() && model.usage.get() ? 'opacity-75' : '')] }, body(model)),
  )
}
