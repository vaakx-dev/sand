import { exactTime } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, span, type Child } from '@vaakx-dev/vrui'
import type { Pc } from '../data/types'
import type { UsageModel } from '../model'
import { allPcs } from '../prefs'
import { agoText } from '../format'
import { offlineNotes } from './notices'

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
  const label = 'Check limits and reload usage'
  return iconButton(
    { 'aria-label': label, title: label, disabled: working, onClick: model.reload },
    dynamicChild(delayed(working), waiting => (waiting ? spinner('md') : icon('reload', 'md'))),
  )
}

const checkedText = ({ metaLine }: Kit, model: UsageModel) => {
  const updated = derive(() => Math.max(0, ...(model.usage.get()?.accounts ?? []).map(account => account.limits?.updated ?? 0)))
  return span(
    { class: 'shrink-0 tabular-nums', title: () => (updated.get() ? exactTime(updated.get()) : '') },
    metaLine(() => {
      model.now.get()
      return updated.get() ? `Checked ${agoText(updated.get())}` : ''
    }),
  )
}

export const toolbar = (kit: Kit, model: UsageModel) =>
  div(
    { class: 'flex min-w-0 items-center gap-2' },
    div(
      { class: 'flex min-w-0 flex-1 flex-col items-end text-right' },
      dynamicChild(model.notices, notices => div({ class: 'contents' }, offlineNotes(kit, notices, model.now))),
      checkedText(kit, model),
    ),
    pcFilter(kit, model),
    refreshButton(kit, model),
  )
