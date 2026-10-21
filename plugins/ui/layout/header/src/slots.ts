import { div, list, sig } from '@vaakx-dev/vrui'
import type { HeaderSide, HeaderView } from './contract'

interface Entry {
  id: number
  view: HeaderView
  order: number
  side: HeaderSide
}

export const createSlots = () => {
  const entries = sig<Entry[]>([])
  let next = 0

  const add = (view: HeaderView, order = 0, side: HeaderSide = 'end') => {
    const entry = { id: ++next, view, order, side }
    entries.update(list => [...list, entry])
    return () => entries.update(list => list.filter(other => other !== entry))
  }

  const host = (side: HeaderSide) => {
    const shown = entries.map(list => list.filter(entry => entry.side === side).sort((a, b) => a.order - b.order))
    return list(
      shown,
      entry => entry.id,
      entry => {
        const { view } = entry.get()
        return typeof view === 'function' ? view() : view
      },
      div({ class: ['flex min-w-0 items-center gap-2', side === 'end' ? 'shrink-0' : 'flex-1'], hidden: shown.map(value => !value.length) }),
    )
  }

  return { add, host }
}

export type Slots = ReturnType<typeof createSlots>
