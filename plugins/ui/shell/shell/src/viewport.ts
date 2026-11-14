import { whenSettled } from '@sand/reactive'
import { listen, sig } from '@vaakx-dev/vrui'

export interface VisibleArea {
  top: number
  height: number
}

const besideKeyboard = (): VisibleArea | undefined => {
  const visible = window.visualViewport
  if (!visible || visible.scale !== 1 || visible.height >= window.innerHeight) return undefined
  return { top: visible.offsetTop, height: visible.height }
}

export const keyboardArea = () => {
  const area = sig<VisibleArea | undefined>(undefined)
  const update = () => area.set(besideKeyboard())
  whenSettled(update)
  if (window.visualViewport) {
    listen(window.visualViewport, 'resize', update)
    listen(window.visualViewport, 'scroll', update)
  }
  return area
}

export const fitArea = (area: VisibleArea | undefined) =>
  area ? { top: `${area.top}px`, bottom: 'auto', height: `${area.height}px`, paddingBottom: '0px' } : null
