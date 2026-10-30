import { onDocument, onTimeout, sig } from '@vaakx-dev/vrui'
import { dropIndexAt } from './integrations/rows'

export interface Dragging {
  from: number
  drop: number
}

const holdMs = 300
const slop = 8

export const moveIndex = <T>(items: T[], from: number, drop: number) => {
  const next = [...items]
  const [moved] = next.splice(from, 1)
  if (moved === undefined) return items
  next.splice(drop > from ? drop - 1 : drop, 0, moved)
  return next
}

export const routeDrag = (moved: (from: number, drop: number) => void) => {
  const dragging = sig<Dragging | undefined>(undefined)
  let list: HTMLElement | undefined

  const follow = (owner: HTMLElement, from: number) => {
    dragging.set({ from, drop: from })
    const stops = [
      onDocument<PointerEvent>(owner, 'pointermove', event => {
        event.preventDefault()
        if (list) dragging.set({ from, drop: dropIndexAt(list, event.clientY) })
      }),
      onDocument(owner, 'pointerup', () => finish(true)),
      onDocument(owner, 'pointercancel', () => finish(false)),
    ]
    const finish = (drop: boolean) => {
      for (const stop of stops) stop()
      const state = dragging.get()
      dragging.set(undefined)
      if (drop && state && state.drop !== state.from && state.drop !== state.from + 1) moved(state.from, state.drop)
    }
  }

  const press = (index: number, event: PointerEvent) => {
    const owner = event.currentTarget
    if (!(owner instanceof HTMLElement) || event.button !== 0) return
    if (event.pointerType !== 'touch') {
      event.preventDefault()
      return follow(owner, index)
    }
    const { clientX, clientY } = event
    const stops: (() => void)[] = []
    const cancel = () => {
      for (const stop of stops) stop()
    }
    stops.push(
      onTimeout(
        () => {
          cancel()
          follow(owner, index)
        },
        holdMs,
        owner,
      ),
      onDocument<PointerEvent>(owner, 'pointermove', move => {
        if (Math.hypot(move.clientX - clientX, move.clientY - clientY) > slop) cancel()
      }),
      onDocument(owner, 'pointerup', cancel),
    )
  }

  return {
    dragging,
    bind: (node: HTMLElement) => {
      list = node
    },
    press,
  }
}
