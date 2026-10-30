import type { ComposerSlot, SlotView } from '../contract'
import { div, list, sig } from '@vaakx-dev/vrui'

interface Entry {
  id: number
  where: ComposerSlot
  view: SlotView
  order: number
}

export const createSlots = () => {
  const entries = sig<Entry[]>([])
  let next = 0

  const add = (where: ComposerSlot, view: SlotView, order = 0) => {
    const entry = { id: ++next, where, view, order }
    entries.update(all => [...all, entry])
    return () => entries.update(all => all.filter(other => other !== entry))
  }

  const empty = (...places: ComposerSlot[]) => entries.map(all => !all.some(entry => places.includes(entry.where)))

  const host = (where: ComposerSlot, className: string, wrap = (node: HTMLElement) => node) =>
    list(
      entries.map(all => all.filter(entry => entry.where === where).sort((a, b) => a.order - b.order)),
      entry => entry.id,
      entry => {
        const { view } = entry.get()
        return wrap(typeof view === 'function' ? view() : view)
      },
      div({ class: className, hidden: empty(where) }),
    )

  return { add, host, empty }
}

export type Slots = ReturnType<typeof createSlots>
