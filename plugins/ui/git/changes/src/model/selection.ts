import { derive, sig } from '@vaakx-dev/vrui'
import { quotable, type DiffLine } from '../patch/line'

export interface PickedLines {
  path: string
  lines: DiffLine[]
  anchor: number
  focus: number
}

export interface LineSpan {
  from: number
  to: number
}

export const spanOf = ({ anchor, focus }: PickedLines): LineSpan => ({ from: Math.min(anchor, focus), to: Math.max(anchor, focus) })

export const pickedLines = (picked: PickedLines) => {
  const { from, to } = spanOf(picked)
  return picked.lines.slice(from, to + 1).filter(quotable)
}

export const lineSelection = () => {
  const picked = sig<PickedLines | undefined>(undefined)
  const count = derive(() => {
    const now = picked.get()
    return now ? pickedLines(now).length : 0
  })

  return {
    picked,
    count,
    of: (path: string) =>
      derive(() => {
        const now = picked.get()
        return now?.path === path ? spanOf(now) : undefined
      }),
    pick(path: string, lines: DiffLine[], index: number, extend: boolean) {
      const now = picked.get()
      const same = now && now.path === path && now.lines === lines ? now : undefined
      if (extend && same) picked.set({ ...same, focus: index })
      else if (same && same.anchor === index && same.focus === index) picked.set(undefined)
      else picked.set({ path, lines, anchor: index, focus: index })
    },
    drag(path: string, index: number) {
      const now = picked.get()
      if (now?.path === path && now.focus !== index) picked.set({ ...now, focus: index })
    },
    clear() {
      picked.set(undefined)
    },
    clearFor(path: string) {
      if (picked.get()?.path === path) picked.set(undefined)
    },
  }
}

export type LineSelection = ReturnType<typeof lineSelection>
