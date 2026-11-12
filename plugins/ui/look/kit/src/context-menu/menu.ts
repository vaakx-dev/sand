import { pressMenu } from '../menus/press'
import type { MenuRequest, MenuSpec, PressAt } from '../contract'
import { dynamicChild, portal, show, sig } from '@vaakx-dev/vrui'
import { iconButton } from '../buttons/button'
import { icon } from '../icons/lucide'
import { selectingIn } from '../gesture/busy'
import { menuPopup } from './popup'
import { menuSheet } from './sheet'

export type TargetLook = 'row' | 'text'

export interface MoreButtonProps {
  title?: string
  size?: 'sm' | 'md'
}

const gap = 4

export const menuLayer = (request: MenuRequest, close: () => void) => (request.touch ? menuSheet(request, close) : menuPopup(request, close))

export const belowOf = (event: MouseEvent): (PressAt & { above: number }) | undefined => {
  const from = event.currentTarget
  if (!(from instanceof HTMLElement)) return undefined
  const box = from.getBoundingClientRect()
  const touch = event instanceof PointerEvent && event.pointerType === 'touch'
  return { x: box.left, y: box.bottom + gap, above: box.top - gap, touch, from }
}

const textPress = (press: ReturnType<typeof pressMenu>) => {
  let touch = false
  return {
    ...press.props,
    onPointerDown(event: PointerEvent) {
      touch = event.pointerType === 'touch'
      if (!touch) press.props.onPointerDown(event)
    },
    onContextMenu(event: MouseEvent) {
      if (touch || selectingIn(event.currentTarget)) return
      press.props.onContextMenu(event)
    },
  }
}

export const contextMenu = () => {
  const opened = sig<MenuRequest | undefined>(undefined)
  const close = () => opened.set(undefined)
  const open = (request: MenuRequest) => {
    if (request.actions.length) opened.set(request)
  }

  const target = (spec: (at: PressAt) => MenuSpec | undefined, onClick?: (event: MouseEvent) => void, look: TargetLook = 'row') => {
    const press = pressMenu(at => {
      const found = spec(at)
      if (found) open({ ...at, ...found })
    })
    const click = (event: MouseEvent) => {
      if (!press.held()) onClick?.(event)
    }
    if (look === 'text') return { ...textPress(press), onClick: click }
    return { ...press.props, onSelectStart: (event: Event) => event.preventDefault(), onClick: click }
  }

  const openBelow = (event: MouseEvent, spec: () => MenuSpec | undefined) => {
    const at = belowOf(event)
    const found = at && spec()
    if (at && found) open({ ...at, ...found })
  }

  const button = (spec: () => MenuSpec | undefined, { title = 'More actions', size = 'md' }: MoreButtonProps = {}) =>
    show(
      () => Boolean(spec()?.actions.length),
      () => iconButton({ size, title, 'aria-label': title, 'aria-haspopup': 'menu', onClick: (event: MouseEvent) => openBelow(event, spec) }, icon('more', size)),
    )

  const view = () => dynamicChild(opened, request => (request ? portal(document.body, menuLayer(request, close)) : null))

  return { target, open, openBelow, button, close, view }
}

export type ContextMenu = ReturnType<typeof contextMenu>
