import { derive, div, dynamicChild, el, exactTime, icon, list, primaryAction, quietButton, rowButton, settingsSection, sig, span, untrack, type Sig } from '@sand/dom'
import { changeList } from '../changes'
import type { Fleet, PcView } from '../fleet/model'
import { canUpdate, changesFor } from '../fleet/status'
import { plural } from '../fleet/text'
import { pcStatusLine } from '../pc-line'
import { sheetFoot } from './foot'

const checkMark = (checked: () => boolean, pickable: () => boolean) =>
  span(
    {
      class: () =>
        [
          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md transition-colors',
          !pickable() ? 'opacity-0' : checked() ? 'bg-accent-500 text-white' : 'ring-1 ring-neutral-600',
        ].join(' '),
    },
    icon('check', 12),
  )

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
    checkMark(checked, pickable),
    div({ class: 'flex min-w-0 flex-1 flex-col' }, span({ class: 'truncate text-sm text-neutral-100' }, () => row.get().name), pcStatusLine(row, fleet)),
  )
}

const heading = (text: string) => el('h3', { class: 'px-1 text-xs font-medium text-neutral-500' }, text)

export const chooseBody = (fleet: Fleet, close: () => void) => {
  const selected = sig(new Set(untrack(() => fleet.pending.get().map(pc => pc.key))))
  const chosen = derive(() => fleet.pcs.get().filter(pc => canUpdate(pc.status) && selected.get().has(pc.key)))
  const changes = derive(() => changesFor(fleet.target.get(), (chosen.get().length ? chosen.get() : fleet.pending.get()).map(pc => pc.status)))
  const update = () => {
    void fleet.update(chosen.get().map(pc => pc.key))
  }
  const later = () => {
    void fleet.later()
    close()
  }
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    div(
      { class: 'flex min-h-0 flex-col gap-5 overflow-auto px-5 pt-1 pb-5' },
      span({ class: 'px-1 text-xs text-neutral-500' }, () => {
        const target = fleet.target.get()
        return target ? `Published ${exactTime(target.publishedAt)}` : ''
      }),
      dynamicChild(
        changes.map(list => list.map(change => change.commit).join()),
        () =>
          changes.get().length
            ? div({ class: 'flex flex-col gap-3' }, heading("What's new"), div({ class: 'px-1' }, changeList(changes.get())))
            : div(),
      ),
      settingsSection(
        { title: 'PCs' },
        list(fleet.pcs, pc => pc.key, row => pcChoice(row, fleet, selected), div({ class: 'contents' })),
      ),
    ),
    sheetFoot(
      quietButton({ onClick: later }, 'Later'),
      primaryAction({ disabled: () => !chosen.get().length, onClick: update }, () =>
        chosen.get().length ? `Update ${plural(chosen.get().length, 'PC')}` : 'Choose a PC',
      ),
    ),
  )
}
