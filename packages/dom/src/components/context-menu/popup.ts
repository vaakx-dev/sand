import { disposeAll, div, dynamicChild, onWindow, sig } from '@vaakx-dev/vrui'
import { layer, returnFocus } from '../../shell/layers'
import { popover } from '../menu'
import { firstStep, menuItems, stepView, type MenuControl, type MenuStep } from './items'
import { arrowKeys, focusFirst } from './keyboard'
import type { MenuRequest } from './request'

const margin = 8

const fitOnScreen = (menu: Element, x: number, y: number) => {
  const { width, height } = menu.getBoundingClientRect()
  return {
    x: Math.max(margin, Math.min(x, innerWidth - width - margin)),
    y: y + height > innerHeight - margin ? Math.max(margin, y - height) : y,
  }
}

export const menuPopup = (request: MenuRequest, close: () => void) => {
  const { actions } = request
  const current = sig<MenuStep | undefined>(firstStep(actions, request.ask))
  const at = sig({ x: request.x, y: request.y })
  const control: MenuControl = { close, step: next => current.set(next), armed: () => true }
  const back = () => {
    current.set(undefined)
    focusFirst(menu)
  }
  const menu = popover(
    close,
    { class: 'top-0 left-0', onKeyDown: arrowKeys },
    dynamicChild(current, step =>
      step ? div({ class: 'w-64' }, stepView(step, control, back, 'sm')) : div({ class: 'flex flex-col' }, ...menuItems(actions, control, 'sm')),
    ),
  )
  return div(
    {
      class: [layer.dialog, 'fixed'],
      'data-menu-layer': '',
      style: { left: () => `${at.get().x}px`, top: () => `${at.get().y}px` },
      onMount: node => {
        at.set(fitOnScreen(menu, request.x, request.y))
        focusFirst(node)
        const stops = [onWindow(node, 'resize', close), returnFocus(node, request.from)]
        return () => disposeAll(stops)
      },
    },
    menu,
  )
}
