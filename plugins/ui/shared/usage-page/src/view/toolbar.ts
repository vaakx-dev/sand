import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, span, type Child } from '@vaakx-dev/vrui'
import type { Pc } from '../data/types'
import type { UsageModel } from '../model'
import { allPcs, type Tab } from '../prefs'

const tabChoices: { value: Tab; label: string }[] = [
  { value: 'usage', label: 'Limits' },
  { value: 'cost', label: 'Cost' },
  { value: 'tokens', label: 'Tokens' },
]

const onLimits = (model: UsageModel) => model.tab.get() === 'usage'

const pcItem = ({ choiceItem }: Kit, model: UsageModel, value: string, close: () => void, ...label: Child[]) =>
  choiceItem(
    {
      selected: () => model.pc.get() === value,
      onClick: () => {
        model.pc.set(value)
        close()
      },
    },
    ...label,
  )

const pcName = (pc: Pc) => span({ class: 'min-w-0 flex-1 truncate' }, pc.name)

const pcFilter = (kit: Kit, model: UsageModel) => {
  const { dot, dropdown, icon, secondaryAction } = kit
  return dynamicChild(model.pcs, pcs =>
    pcs.length > 1
      ? dropdown({
          placement: 'below-right',
          trigger: press =>
            secondaryAction(
              { ...press, title: 'Show usage from', class: 'max-w-48' },
              span({ class: 'truncate' }, () => pcs.find(pc => pc.id === model.pc.get())?.name ?? 'All PCs'),
              icon('down', 'sm'),
            ),
          items: close => [
            pcItem(kit, model, allPcs, close, span({ class: 'min-w-0 flex-1' }, 'All PCs')),
            ...pcs.map(pc => pcItem(kit, model, pc.id, close, dot(pc.online ? 'success' : 'neutral'), pcName(pc))),
          ],
        })
      : null,
  )
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
    { class: 'flex items-center gap-2' },
    segmented(tabChoices, model.tab, value => model.tab.set(value), { label: 'View' }),
    span({ class: 'flex-1' }),
    pcFilter(kit, model),
    refreshButton(kit, model),
  )
}
