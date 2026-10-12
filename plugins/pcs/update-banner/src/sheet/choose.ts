import { checkMark, derive, div, dynamicChild, exactTime, h3, primaryAction, rowButton, secondaryAction, rowList, settingsSection, sheetBody, sheetFoot, sig, span, untrack, type Sig } from '@sand/dom'
import { plural } from '@sand/kit'
import { changeList } from '../changes'
import type { Fleet, PcView } from '../fleet/model'
import { canUpdate, changesFor } from '../fleet/status'
import { pcStatusLine } from '../pc-line'

const pcChoice = (row: Sig<PcView>, fleet: Fleet, selected: Sig<Set<string>>) => {
  const pickable = () => canUpdate(row.get().status)
  const checked = () => pickable() && selected.get().has(row.get().key)
  const toggle = () => {
    const next = new Set(selected.get())
    const key = row.get().key
    if (next.has(key)) next.delete(key)
    else next.add(key)
    selected.set(next)
  }
  return rowButton(
    {
      role: 'checkbox',
      'aria-checked': () => String(checked()),
      disabled: () => !pickable(),
      class: 'gap-3 bg-neutral-900 px-4 py-3',
      onClick: toggle,
    },
    checkMark(checked, () => (pickable() ? '' : 'opacity-0')),
    div({ class: 'flex min-w-0 flex-1 flex-col' }, span({ class: 'truncate text-sm font-medium text-neutral-100' }, () => row.get().name), pcStatusLine(row, fleet)),
  )
}

export const chooseBody = (fleet: Fleet, close: () => void) => {
  const selected = sig(new Set(untrack(() => fleet.pending.get().map(pc => pc.key))))
  const chosen = derive(() => fleet.pcs.get().filter(pc => canUpdate(pc.status) && selected.get().has(pc.key)))
  const changes = derive(() => changesFor(fleet.target.get(), (chosen.get().length ? chosen.get() : fleet.pending.get()).map(pc => pc.status)))
  const later = () => {
    void fleet.later()
    close()
  }
  const whatsNew = () =>
    changes.get().length
      ? div({ class: 'flex flex-col gap-3' }, h3({ class: 'px-1 text-xs font-medium text-neutral-500' }, "What's new"), div({ class: 'px-1' }, changeList(changes.get())))
      : null
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    sheetBody(
      {},
      span({ class: 'px-1 text-xs text-neutral-500' }, () => {
        const target = fleet.target.get()
        return target ? `Published ${exactTime(target.publishedAt)}` : ''
      }),
      dynamicChild(
        changes.map(list => list.map(change => change.commit).join()),
        whatsNew,
      ),
      settingsSection({ title: 'PCs' }, rowList(fleet.pcs, pc => pc.key, row => pcChoice(row, fleet, selected))),
    ),
    sheetFoot(
      secondaryAction({ onClick: later }, 'Later'),
      primaryAction({ disabled: () => !chosen.get().length, onClick: () => void fleet.update(chosen.get().map(pc => pc.key)) }, () =>
        chosen.get().length ? `Update ${plural(chosen.get().length, 'PC')}` : 'Choose a PC',
      ),
    ),
  )
}
