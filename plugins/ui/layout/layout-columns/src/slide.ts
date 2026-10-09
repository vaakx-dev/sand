export interface Shift {
  px: number
  settling: boolean
}

export const settleMs = 250

const rem = 20

export const drawerWidth = (viewport: number) => Math.min(rem * parseFloat(getComputedStyle(document.documentElement).fontSize), viewport * 0.85)

const follow = (property: string, shift: Shift) => ({ transition: shift.settling ? `${property} ${settleMs}ms cubic-bezier(.2,.8,.2,1)` : 'none' })

export const slideSide = (shift: Shift | undefined) =>
  shift ? { transform: `translateX(calc(-100% + ${Math.max(shift.px, 0)}px))`, ...follow('transform', shift) } : null

export const slideAside = (shift: Shift | undefined) =>
  shift ? { transform: `translateX(calc(100% + ${Math.min(shift.px, 0)}px))`, ...follow('transform', shift) } : null

export const backdropOpacity = (shift: Shift | undefined) => {
  if (!shift) return null
  const viewport = document.documentElement.clientWidth
  return { opacity: String(Math.min(Math.max(shift.px / drawerWidth(viewport), 0), 1)), ...follow('opacity', shift) }
}
