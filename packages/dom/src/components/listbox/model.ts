import { keys, sig, untrack, type KeyMap } from '@vaakx-dev/vrui'

export interface ListboxOptions {
  count(): number
  choose(index: number): void
  start?: number
  wrap?: boolean
  pageSize?: number
}

export type Listbox = ReturnType<typeof listbox>

export const listbox = ({ count, choose, start = 0, wrap = false, pageSize = 10 }: ListboxOptions) => {
  const selected = sig(start)
  let following = true

  const total = () => untrack(count)

  const clamp = (index: number) => Math.max(0, Math.min(total() - 1, index))

  const select = (index: number, reveal = true) => {
    following = reveal
    selected.set(total() ? clamp(index) : -1)
  }

  const move = (step: number) => {
    const length = total()
    if (!length) return
    const current = selected.get()
    if (current < 0) return select(step > 0 ? 0 : length - 1)
    select(wrap ? (current + step + length) % length : current + step)
  }

  const page = (direction: 1 | -1) => select(Math.max(0, selected.get() + direction * pageSize))

  const pick = (index = selected.get()) => {
    if (index < 0 || index >= total()) return false
    choose(index)
    return true
  }

  const keyMap: KeyMap = {
    ArrowDown: () => move(1),
    ArrowUp: () => move(-1),
    PageDown: () => page(1),
    PageUp: () => page(-1),
    Enter: () => {
      pick()
    },
  }

  const handleKeys = keys(keyMap, { stop: true })

  return {
    selected,
    isSelected: (index: number) => selected.get() === index,
    following: () => following,
    select,
    hover: (index: number) => {
      if (selected.get() !== index) select(index, false)
    },
    clear: () => selected.set(-1),
    move,
    page,
    first: () => select(0),
    last: () => select(total() - 1),
    pick,
    keyMap,
    onKeyDown: (event: KeyboardEvent) => {
      if (!event.isComposing) handleKeys(event)
    },
  }
}
