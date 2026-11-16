import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, span, type Child } from '@vaakx-dev/vrui'
import type { Pc } from '../../data/types'
import type { UsageModel } from '../../model'
import { allPcs } from '../../prefs'

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

export const pcFilter = (kit: Kit, model: UsageModel) => {
  const { dot, dropdown, icon, secondaryAction } = kit
  return dynamicChild(model.pcs, pcs =>
    pcs.length > 1
      ? dropdown({
          placement: 'below-right',
          trigger: press =>
            secondaryAction(
              { ...press, title: 'Show spend from', class: 'max-w-40' },
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
