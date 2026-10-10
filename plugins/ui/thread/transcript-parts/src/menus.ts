import { copyWithNotice, pressMenu, type ContextMenu, type MenuSpec } from '@sand/dom'
import type { Context } from 'drydock'
import type { MenuKit } from './contract'

const selectingIn = (node: EventTarget | null) => {
  const selection = getSelection()
  return Boolean(selection && !selection.isCollapsed && node instanceof Node && node.contains(selection.anchorNode))
}

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
      press.props.onPointerDown(event)
    },
    onContextMenu(event: MouseEvent) {
      if (!touch && selectingIn(event.currentTarget)) return
      press.props.onContextMenu(event)
    },
  }
  return { props, held: press.held }
}

export const menuKit = (ctx: Context): MenuKit => ({
  text: textMenu,
  copy: (id, label, text, what) => ({ id, label, icon: 'copy', tile: true, run: () => copyWithNotice(ctx.notify, text(), what) }),
})
