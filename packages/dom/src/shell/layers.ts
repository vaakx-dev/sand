import { onWindow } from '@vaakx-dev/vrui'

export const layer = {
  sticky: 'z-10',
  dock: 'z-20',
  menu: 'z-20',
  drawer: 'z-30',
  dialog: 'z-40',
  toast: 'z-50',
  tooltip: 'z-50',
} as const

interface Layer {
  close: () => void
  overlay: boolean
}

const stack: Layer[] = []

export const hasOpenLayer = (overlaysOnly = false) => stack.some(layer => layer.overlay || !overlaysOnly)

export const dismissible = (owner: Node, close: () => void, { overlay = true } = {}) => {
  const entry: Layer = { close, overlay }
  stack.push(entry)
  const stop = onWindow(owner, 'keydown', event => {
    if ((event as KeyboardEvent).key !== 'Escape' || event.defaultPrevented || stack.at(-1) !== entry) return
    event.preventDefault()
    close()
  })
  return () => {
    stop()
    const index = stack.lastIndexOf(entry)
    if (index >= 0) stack.splice(index, 1)
  }
}
