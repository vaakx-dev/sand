import { exactTime } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show, span } from '@vaakx-dev/vrui'
import type { Pc } from '../data/types'
import { agoText } from '../format'
import type { UsageModel } from '../model'
import { allPcs, type Tab } from '../prefs'

const tabChoices: { value: Tab; label: string }[] = [
  { value: 'usage', label: 'Limits' },
  { value: 'cost', label: 'Cost' },
  { value: 'tokens', label: 'Tokens' },
]

const pcChoice = ({ dot }: Kit, pc: Pc) => ({ value: pc.id, label: pc.name, title: pc.online ? 'Online' : 'Offline', mark: dot(pc.online ? 'success' : 'neutral') })

const pcFilter = (kit: Kit, model: UsageModel) => {
  const { segmented } = kit
  return dynamicChild(model.pcs, pcs =>
    pcs.length > 1
      ? segmented([{ value: allPcs, label: 'All PCs' }, ...pcs.map(pc => pcChoice(kit, pc))], model.pc, value => model.pc.set(value), { label: 'PC' })
      : null,
  )
}

const onLimits = (model: UsageModel) => model.tab.get() === 'usage'

const checkedText = (model: UsageModel) => {
  const updated = derive(() => Math.max(0, ...(model.usage.get()?.accounts ?? []).map(account => account.limits?.updated ?? 0)))
  return span({ class: 'text-xs text-neutral-500 tabular-nums', title: () => (updated.get() ? exactTime(updated.get()) : '') }, () => {
    model.now.get()
    return updated.get() ? `Checked ${agoText(updated.get())}` : ''
  })
}

const refreshButton = ({ delayed, icon, iconButton, spinner }: Kit, model: UsageModel) => {
  const working = derive(() => model.busy.get() || model.checking.get())
  const label = () => (onLimits(model) ? 'Check limits now' : 'Reload usage')
  return iconButton(
    { 'aria-label': label, title: label, disabled: working, onClick: () => (onLimits(model) ? model.checkLimits() : model.refresh()) },
    dynamicChild(delayed(working), waiting => (waiting ? spinner('md') : icon('reload', 'md'))),
  )
}

export const toolbar = (kit: Kit, model: UsageModel) => {
  const { segmented } = kit
  return div(
    { class: 'flex flex-wrap items-center gap-2' },
    segmented(tabChoices, model.tab, value => model.tab.set(value), { label: 'View' }),
    span({ class: 'flex-1' }),
    pcFilter(kit, model),
    show(() => onLimits(model), () => checkedText(model)),
    refreshButton(kit, model),
  )
}
