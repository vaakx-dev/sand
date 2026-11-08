import { byOrder } from '@sand/util'
import type { ComposerSlot, ComposerView, SlotView } from '../contract'
import { derive, div, list, sig } from '@vaakx-dev/vrui'

interface Entry {
  id: number
  where: ComposerSlot
  view: SlotView
  order: number
}

let next = 0

export const createSlots = (shared?: { entries: { get(): Entry[] } }) => {
  const own = sig<Entry[]>([])
  const entries = derive(() => [...own.get(), ...(shared?.entries.get() ?? [])])

  const add = (where: ComposerSlot, view: SlotView, order = 0) => {
    const entry = { id: ++next, where, view, order }
    own.update(all => [...all, entry])
    return () => own.update(all => all.filter(other => other !== entry))
  }

  const empty = (where: ComposerSlot) => entries.map(all => !all.some(entry => entry.where === where))

  const host = (where: ComposerSlot, className: string, here: ComposerView, wrap = (node: HTMLElement) => node) =>
    list(
      entries.map(all => all.filter(entry => entry.where === where).sort(byOrder)),
      entry => entry.id,
      entry => wrap(entry.get().view(here)),
      div({ class: className, hidden: empty(where) }),
    )

  return { add, host, empty, entries }
}

export type Slots = ReturnType<typeof createSlots>
