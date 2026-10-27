import type { Kit } from '@sand/ui-kit/contract'
import { exactTime, plural } from '@sand/util'
import { derive, div, dynamicChild, sig, span, untrack, type Sig } from '@vaakx-dev/vrui'
import { changesRow } from '../changes'
import type { Fleet, PcView } from '../fleet/model'
import { canUpdate, changesFor } from '../fleet/status'
import { pcStatusLine } from '../pc-line'

const pcChoice = (kit: Kit, row: Sig<PcView>, fleet: Fleet, selected: Sig<Set<string>>) => {
  const { listRow } = kit
  const pickable = () => canUpdate(row.get().status)
  const checked = () => pickable() && selected.get().has(row.get().key)
  const toggle = () => {
    const next = new Set(selected.get())
    const key = row.get().key
    if (next.has(key)) next.delete(key)
    else next.add(key)
    selected.set(next)
  }
  return listRow({
    surface: 'group',
    role: 'checkbox',
    'aria-checked': () => String(checked()),
    disabled: () => !pickable(),
    title: () => row.get().name,
    meta: pcStatusLine(kit, row, fleet),
    selected: checked,
    onClick: toggle,
  })
}

export const chooseBody = (kit: Kit, fleet: Fleet, close: () => void) => {
  const { primaryAction, rowList, secondaryAction, settingsSection, sheetBody, sheetFoot } = kit
  const selected = sig(new Set(untrack(() => fleet.pending.get().map(pc => pc.key))))
  const chosen = derive(() => fleet.pcs.get().filter(pc => canUpdate(pc.status) && selected.get().has(pc.key)))
  const changes = derive(() => changesFor(fleet.target.get(), (chosen.get().length ? chosen.get() : fleet.pending.get()).map(pc => pc.status)))
  const published = () => {
    const target = fleet.target.get()
    return target ? `Published ${exactTime(target.publishedAt)}` : ''
  }
  const later = () => {
    void fleet.later()
    close()
  }
  const whatsNew = () =>
    changes.get().length
      ? settingsSection(
          { title: "What's new", action: span(published) },
          changesRow(kit, changes.get()),
        )
      : null
  return div(
    { class: 'flex min-h-0 flex-1 flex-col' },
    sheetBody(
      {},
      dynamicChild(
        changes.map(list => list.map(change => change.commit).join()),
        whatsNew,
      ),
      settingsSection({ title: 'PCs' }, rowList(fleet.pcs, pc => pc.key, row => pcChoice(kit, row, fleet, selected))),
    ),
    sheetFoot(
      secondaryAction({ onClick: later }, 'Later'),
      primaryAction({ disabled: () => !chosen.get().length, onClick: () => void fleet.update(chosen.get().map(pc => pc.key)) }, () =>
        chosen.get().length ? `Update ${plural(chosen.get().length, 'PC')}` : 'Choose a PC',
      ),
    ),
  )
}
