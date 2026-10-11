import { copyWithNotice, icon, iconButton, pressMenu, type ContextMenu, type MenuSpec } from '@sand/dom'
import type { Context } from 'drydock'
import type { MenuKit } from './contract'
import { selectingIn } from './integrations/select'

const textMenu = (menu: ContextMenu, spec: () => MenuSpec | undefined) => {
  const press = pressMenu(at => {
    const found = spec()
    if (found) menu.open({ ...at, ...found })
  })
  let touch = false
  const props = {
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
  return { props, held: press.held }
}

const moreButton = (menu: ContextMenu, spec: () => MenuSpec | undefined) =>
  iconButton(
    {
      size: 'sm',
      title: 'More actions',
      'aria-label': 'More actions',
      onClick: (event: MouseEvent) => {
        const from = event.currentTarget
        const found = spec()
        if (!(from instanceof HTMLElement) || !found) return
        const box = from.getBoundingClientRect()
        const touch = event instanceof PointerEvent && event.pointerType === 'touch'
        menu.open({ x: box.left, y: box.bottom, touch, from, ...found })
      },
    },
    icon('more', 14),
  )

export const menuKit = (ctx: Context): MenuKit => ({
  text: textMenu,
  more: moreButton,
  copy: (id, label, text, what) => ({ id, label, icon: 'copy', tile: true, run: () => copyWithNotice(ctx.notify, text(), what) }),
})
