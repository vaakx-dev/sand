import type { NavAction } from '@sand/dom'
import { div, dynamicChild, layer, onWindow, popover, sig } from '@sand/dom'
import { askView } from './ask'
import { arrowKeys, confirmView, firstStep, focusFirst, menuItems, returnFocus, type MenuControl, type MenuStep } from './items'
import type { MenuRequest } from './view'

const margin = 8

const fit = (node: HTMLElement, x: number, y: number) => {
  const menu = node.firstElementChild
  if (!menu) return { x, y }
  const { width, height } = menu.getBoundingClientRect()
  return {
    x: Math.max(margin, Math.min(x, innerWidth - width - margin)),
    y: y + height > innerHeight - margin ? Math.max(margin, y - height) : y,
  }
}

const stepView = (step: MenuStep, control: MenuControl, back: () => void) =>
  div(
    { class: 'w-64' },
    step.kind === 'confirm' ? confirmView(step.action, control, back, 'sm') : step.action.ask ? askView(step.action.ask, control.close, 'sm') : null,
  )

export const menuPopup = (request: MenuRequest, actions: NavAction[], close: () => void) => {
  const current = sig<MenuStep | undefined>(firstStep(actions, request.ask))
  const at = sig({ x: request.x, y: request.y })
  const control: MenuControl = { close, step: next => current.set(next), armed: () => true }
  let root: HTMLElement | undefined
  const back = () => {
    current.set(undefined)
    if (root) focusFirst(root)
  }
  return div(
    {
      class: [layer.dialog, 'fixed'],
      style: { left: () => `${at.get().x}px`, top: () => `${at.get().y}px` },
      onMount: node => {
        root = node
        at.set(fit(node, request.x, request.y))
        focusFirst(node)
        const stopResize = onWindow(node, 'resize', close)
        const refocus = returnFocus(node, request.from)
        return () => {
          stopResize()
          refocus()
        }
      },
    },
    popover(
      close,
      { style: { left: '0', top: '0' }, onKeyDown: arrowKeys },
      dynamicChild(current, step => (step ? stepView(step, control, back) : div({ class: 'flex flex-col' }, ...menuItems(actions, control, 'sm')))),
    ),
  )
}
