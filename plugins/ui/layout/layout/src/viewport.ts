import { derive, listen, sig, type Sig } from '@vaakx-dev/vrui'

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
  const area = sig(besideKeyboard())
  const update = () => area.set(besideKeyboard())
  if (window.visualViewport) {
    listen(window.visualViewport, 'resize', update)
    listen(window.visualViewport, 'scroll', update)
  }
  return area
}

export const fitArea = (area: VisibleArea | undefined) =>
  area ? { top: `${area.top}px`, bottom: 'auto', height: `${area.height}px`, paddingBottom: '0px' } : null

const editing = () => {
  const focused = document.activeElement
  return focused instanceof HTMLElement && (focused.isContentEditable || focused.matches('input, textarea, select'))
}

const squeeze = 120

export const keyboardShown = (area: Sig<VisibleArea | undefined>) => {
  let tallest = { width: window.innerWidth, height: window.innerHeight }
  const squeezed = sig(false)
  listen(window, 'resize', () => {
    const { innerWidth: width, innerHeight: height } = window
    tallest = width === tallest.width ? { width, height: Math.max(tallest.height, height) } : { width, height }
    squeezed.set(tallest.height - height > squeeze && editing())
  })
  return derive(() => Boolean(area.get()) || squeezed.get())
}
