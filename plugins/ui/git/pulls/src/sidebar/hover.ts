import { onTimeout, registerInScope, sig } from '@vaakx-dev/vrui'

export interface HoverAt {
  x: number
  y: number
  above: number
}

const openMs = 150
const closeMs = 150

const pointing = (event: PointerEvent) => event.pointerType === 'mouse' || event.pointerType === 'pen'

export const hoverCard = () => {
  const at = sig<HoverAt | undefined>(undefined)
  let pending: (() => void) | undefined
  const cancel = () => {
    pending?.()
    pending = undefined
  }
  const later = (run: () => void, ms: number) => {
    cancel()
    pending = onTimeout(run, ms)
  }
  const leave = () => later(() => at.set(undefined), closeMs)
  registerInScope(cancel)

  return {
    at,
    close() {
      cancel()
      at.set(undefined)
    },
    anchor: {
      onPointerEnter(event: PointerEvent) {
        if (!pointing(event) || !(event.currentTarget instanceof Element)) return
        const box = event.currentTarget.getBoundingClientRect()
        later(() => at.set({ x: box.left, y: box.bottom + 4, above: box.top - 4 }), openMs)
      },
      onPointerLeave: leave,
    },
    card: { onPointerEnter: cancel, onPointerLeave: leave },
  }
}

export type HoverCard = ReturnType<typeof hoverCard>
