import { pressMenu, type ContextMenu, type MenuSpec } from '@sand/dom'

export type Within = (node: HTMLElement) => Element | null

const selectingIn = (node: HTMLElement) => {
  const selection = getSelection()
  return Boolean(selection && !selection.isCollapsed && node.contains(selection.anchorNode))
}

export const textMenu = (menu: ContextMenu, spec: () => MenuSpec | undefined, within?: Within) => {
  const press = pressMenu(at => {
    const found = spec()
    if (found) menu.open({ ...at, ...found })
  })
  let touch = false
  const inside = (event: Event) => {
    const node = event.currentTarget as HTMLElement
    const scope = within?.(node)
    return !within || Boolean(scope?.contains(event.target as Node))
  }
  const props = {
    ...press.props,
    onPointerDown(event: PointerEvent) {
      touch = event.pointerType === 'touch'
      if (inside(event)) press.props.onPointerDown(event)
    },
    onContextMenu(event: MouseEvent) {
      if (!inside(event)) return
      if (!touch && selectingIn(event.currentTarget as HTMLElement)) return
      press.props.onContextMenu(event)
    },
  }
  return { props, held: press.held }
}
