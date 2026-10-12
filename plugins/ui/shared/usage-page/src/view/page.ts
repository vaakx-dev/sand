import { delayed } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show } from '@vaakx-dev/vrui'
import type { Merged } from '../data/types'
import { usageModel, type UsageDeps, type UsageModel } from '../model'
import { accountsView } from './accounts'
import { breakdownView } from './breakdown'
import { chartView } from './chart'
import { headline } from './headline'
import { offlineNotices, unpricedNotes } from './notices'
import { toolbar } from './toolbar'

type BodyState = Merged | 'waiting' | 'empty' | 'missing'

const noUsage = ({ hintRow, settingsSection }: Kit) => settingsSection({}, hintRow('No usage in this range'))

const pending = ({ hintRow, settingsSection }: Kit) => show(delayed(true), () => settingsSection({}, hintRow('Loading…')))

const content = (kit: Kit, usage: Merged, model: UsageModel) => {
  const accounts = accountsView(usage.accounts, { kit, now: model.now, nameOf: model.nameOf, checking: model.checking, check: model.checkLimits })
  if (!usage.total.turns) return div({ class: 'flex flex-col gap-6' }, accounts, noUsage(kit))
  return div(
    { class: 'flex flex-col gap-6' },
    headline(usage),
    accounts,
    chartView(kit, usage, model.metric),
    div(
      { class: 'flex flex-col gap-2' },
      breakdownView({ kit, usage, nameOf: model.nameOf, openThread: model.openThread, copy: model.copy, showOnly: model.showOnly }, model.breakdown),
      unpricedNotes(kit, usage.unpriced),
    ),
  )
}

const stateOf = (model: UsageModel): BodyState => {
  const usage = model.usage.get()
  if (usage) return usage
  if (model.busy.get()) return 'waiting'
  return model.notices.get().length ? 'missing' : 'empty'
}

const bodyOf = (kit: Kit, state: BodyState, model: UsageModel) => {
  if (typeof state === 'object') return content(kit, state, model)
  if (state === 'waiting') return pending(kit)
  return state === 'empty' ? noUsage(kit) : null
}

export const usagePage = (kit: Kit, deps: UsageDeps) => {
  const model = usageModel(deps)
  return div(
    { class: 'flex w-full flex-col gap-6' },
    toolbar(kit, model),
    dynamicChild(model.notices, notices => offlineNotices(kit, notices, model.now)),
    div(
      { class: ['transition', () => (model.busy.get() && model.usage.get() ? 'opacity-75' : '')] },
      dynamicChild(
        derive(() => stateOf(model)),
        state => bodyOf(kit, state, model),
      ),
    ),
  )
}
