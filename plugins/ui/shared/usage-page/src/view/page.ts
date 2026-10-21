import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show } from '@vaakx-dev/vrui'
import type { Merged } from '../data/types'
import { usageModel, type UsageDeps, type UsageModel } from '../model'
import type { Tab } from '../prefs'
import { limitsView } from './accounts'
import { offlineNotices } from './notices'
import { spendView } from './spend'
import { toolbar } from './toolbar'

type BodyState = Merged | 'waiting' | 'empty' | 'missing'

const noUsage = ({ hintRow, settingsSection }: Kit) => settingsSection({}, hintRow('No usage in this range'))

const pending = ({ delayed, hintRow, settingsSection }: Kit) => show(delayed(true), () => settingsSection({}, hintRow('Loading…')))

const limits = (kit: Kit, usage: Merged, model: UsageModel) =>
  div(
    { class: 'flex flex-col gap-6' },
    limitsView(usage.accounts, {
      kit,
      now: model.now,
      nameOf: model.nameOf,
      checking: model.checking,
      check: model.checkLimits,
      history: model.history,
      opened: model.opened,
      windows: model.windows,
      setOpen: model.setOpen,
      setWindow: model.setWindow,
    }),
  )

const stateOf = (model: UsageModel): BodyState => {
  const usage = model.usage.get()
  if (usage) return usage
  if (model.busy.get()) return 'waiting'
  return model.notices.get().length ? 'missing' : 'empty'
}

const bodyOf = (kit: Kit, state: BodyState, tab: Tab, model: UsageModel) => {
  if (typeof state === 'object') return tab === 'usage' ? limits(kit, state, model) : spendView(kit, state, model, tab)
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
        derive(() => ({ state: stateOf(model), tab: model.tab.get() })),
        ({ state, tab }) => bodyOf(kit, state, tab, model),
      ),
    ),
  )
}
