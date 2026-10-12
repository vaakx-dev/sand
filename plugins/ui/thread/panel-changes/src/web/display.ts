import { sig, stored } from '@vaakx-dev/vrui'

export interface Selection {
  key: string
  from: number
  to: number
}

const wideFrom = 720
const compactBelow = 480

export const displayState = () => {
  const width = sig(0)
  const selection = sig<Selection | undefined>(undefined)
  const opened = sig<Record<string, string[]>>({})

  const select = (key: string, at: number) => {
    const current = selection.get()
    const same = current?.key === key
    if (same && at >= current.from && at <= current.to) return selection.set(undefined)
    if (same && current.from === current.to) return selection.set({ key, from: Math.min(at, current.from), to: Math.max(at, current.to) })
    selection.set({ key, from: at, to: at })
  }

  const expand = (key: string, id: string) => opened.set({ ...opened.get(), [key]: [...(opened.get()[key] ?? []), id] })

  const splitChoice = stored('sand.changes.split', false)
  const wrapChoice = stored('sand.changes.wrap', true)
  const compact = () => width.get() > 0 && width.get() < compactBelow
  const split = () => splitChoice.get() && !compact()

  return {
    splitChoice,
    wrapChoice,
    split,
    wrap: () => split() || wrapChoice.get(),
    compact,
    wide: () => width.get() >= wideFrom,
    width,
    filter: sig(''),
    selection,
    opened,
    select,
    expand,
  }
}

export type Display = ReturnType<typeof displayState>
