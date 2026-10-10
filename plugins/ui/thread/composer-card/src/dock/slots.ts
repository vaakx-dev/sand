import type { ComposerSlot, SlotView } from '../contract'
import { div, list, sig } from '@sand/dom'

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

  const host = (where: ComposerSlot, className: string) =>
    list(
      entries.map(all => all.filter(entry => entry.where === where).sort((a, b) => a.order - b.order)),
      entry => entry.id,
      entry => {
        const { view } = entry.get()
        return typeof view === 'function' ? view() : view
      },
      div({ class: className, hidden: entries.map(all => !all.some(entry => entry.where === where)) }),
    )

  return { add, host }
}

export type Slots = ReturnType<typeof createSlots>
