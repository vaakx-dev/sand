import { div, list, sig } from '@vaakx-dev/vrui'
import type { ChangesSlot, ChangesView } from '../contract'

interface Entry {
  id: number
  view: ChangesView
  slot: ChangesSlot
}

export const createSlots = () => {
  const entries = sig<Entry[]>([])
  let next = 0

  const add = (view: ChangesView, slot: ChangesSlot) => {
    const entry = { id: ++next, view, slot }
    entries.update(all => [...all, entry])
    return () => entries.update(all => all.filter(other => other !== entry))
  }

  const host = (slot: ChangesSlot) =>
    list(
      entries.map(all => all.filter(entry => entry.slot === slot)),
      entry => entry.id,
      entry => entry.get().view(),
      div({ class: 'contents' }),
    )

  return { add, host }
}

export type Slots = ReturnType<typeof createSlots>
