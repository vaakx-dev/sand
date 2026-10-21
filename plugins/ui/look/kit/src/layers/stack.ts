import { disposeAll, onWindow } from '@vaakx-dev/vrui'
import { onCloseRequest } from '../page/close-request'

interface OpenLayer {
  close: () => void
  overlay: boolean
}

const stack: OpenLayer[] = []

export const hasOpenLayer = (overlaysOnly = false) => stack.some(open => open.overlay || !overlaysOnly)

export const dismissible = (owner: Node, close: () => void, { overlay = true } = {}) => {
  const entry: OpenLayer = { close, overlay }
  stack.push(entry)
  const stops = [
    onWindow<KeyboardEvent>(owner, 'keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented || stack.at(-1) !== entry) return
      event.preventDefault()
      close()
    }),
    onCloseRequest(close),
  ]
  if (overlay) stops.push(onWindow(owner, 'popstate', close))
  return () => {
    disposeAll(stops)
    const index = stack.lastIndexOf(entry)
    if (index >= 0) stack.splice(index, 1)
  }
}

export const returnFocus = (node: Node, to: Element | null) => () => {
  const active = document.activeElement
  const lost = !active || active === document.body || node.contains(active)
  if (to instanceof HTMLElement && to.isConnected && lost) to.focus()
}

export const modal = (node: Node, close: () => void, from: Element | null) => {
  const stops = [dismissible(node, close), returnFocus(node, from)]
  return () => disposeAll(stops)
}
