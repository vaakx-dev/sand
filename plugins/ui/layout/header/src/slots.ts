import { div, list, sig } from '@sand/dom'
import type { HeaderView } from './contract'

interface Entry {
  id: number
  view: HeaderView
  order: number
}

export const createSlots = () => {
  const entries = sig<Entry[]>([])
  let next = 0

  const add = (view: HeaderView, order = 0) => {
    const entry = { id: ++next, view, order }
    entries.update(list => [...list, entry])
    return () => entries.update(list => list.filter(other => other !== entry))
  }

  const filled = entries.map(list => list.length > 0)

  const host = () =>
    list(
      entries.map(list => [...list].sort((a, b) => a.order - b.order)),
      entry => entry.id,
      entry => {
        const { view } = entry.get()
        return typeof view === 'function' ? view() : view
      },
      div({ class: 'flex min-w-0 shrink-0 items-center gap-2', hidden: filled.map(value => !value) }),
    )

  return { add, host, filled }
}

export type Slots = ReturnType<typeof createSlots>
