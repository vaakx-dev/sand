import { derive, sig } from '@vaakx-dev/vrui'
import type { DiffLine, DiffSelection } from '../contract'
import { quotable } from '../patch/line'
import { rangeOf } from './range'

interface Picked {
  path: string
  lines: DiffLine[]
  anchor: number
  focus: number
}

export interface LineSpan {
  from: number
  to: number
}

const spanOf = ({ anchor, focus }: Picked): LineSpan => ({ from: Math.min(anchor, focus), to: Math.max(anchor, focus) })

const rangeOfPick = (picked: Picked) => {
  const { from, to } = spanOf(picked)
  return rangeOf(picked.path, picked.lines.slice(from, to + 1).filter(quotable))
}

export const linePicker = () => {
  const picked = sig<Picked | undefined>(undefined)
  const dragging = sig(false)
  const range = derive(() => {
    const now = picked.get()
    return now ? rangeOfPick(now) : undefined
  })
  const settled = derive(() => (dragging.get() ? undefined : range.get()))

  const selection: DiffSelection = {
    range,
    settled,
    clear(path) {
      if (path === undefined || picked.get()?.path === path) picked.set(undefined)
    },
  }

  return {
    selection,
    of: (path: string) =>
      derive(() => {
        const now = picked.get()
        return now?.path === path ? spanOf(now) : undefined
      }),
    pick(path: string, lines: DiffLine[], index: number, extend: boolean, drag: boolean) {
      const now = picked.get()
      const same = now && now.path === path && now.lines === lines ? now : undefined
      dragging.set(drag)
      if (extend && same) picked.set({ ...same, focus: index })
      else if (same && same.anchor === index && same.focus === index) picked.set(undefined)
      else picked.set({ path, lines, anchor: index, focus: index })
    },
    drag(path: string, index: number) {
      const now = picked.get()
      if (now?.path === path && now.focus !== index) picked.set({ ...now, focus: index })
    },
    release() {
      dragging.set(false)
    },
  }
}

export type LinePicker = ReturnType<typeof linePicker>
