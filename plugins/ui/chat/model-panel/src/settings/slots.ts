import { byOrder } from '@sand/util'
import { div, list, sig } from '@vaakx-dev/vrui'
import type { DefaultsView } from '../contract'

interface Entry {
  id: number
  view: DefaultsView
  order: number
}

export const createSlots = () => {
  const entries = sig<Entry[]>([])
  let next = 0

  const add = (view: DefaultsView, order = 0) => {
    const entry = { id: ++next, view, order }
    entries.update(all => [...all, entry].sort(byOrder))
    return () => entries.update(all => all.filter(other => other !== entry))
  }

  const host = () =>
    list(
      entries,
      entry => entry.id,
      entry => entry.get().view(),
      div({ class: 'contents' }),
    )

  return { add, host }
}

export type Slots = ReturnType<typeof createSlots>
