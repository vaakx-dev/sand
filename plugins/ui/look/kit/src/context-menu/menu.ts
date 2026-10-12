import { pressMenu } from '@sand/kit/web'
import type { MenuRequest, MenuSpec } from '@sand/protocol'
import { dynamicChild, portal, sig } from '@vaakx-dev/vrui'
import { menuPopup } from './popup'
import { menuSheet } from './sheet'

export const menuLayer = (request: MenuRequest, close: () => void) => (request.touch ? menuSheet(request, close) : menuPopup(request, close))

export const contextMenu = () => {
  const opened = sig<MenuRequest | undefined>(undefined)
  const close = () => opened.set(undefined)
  const open = (request: MenuRequest) => {
    if (request.actions.length) opened.set(request)
  }

  const target = (spec: () => MenuSpec | undefined, onClick?: (event: MouseEvent) => void) => {
    const press = pressMenu(at => {
      const found = spec()
      if (found) open({ ...at, ...found })
    })
    return {
      ...press.props,
      onSelectStart: (event: Event) => event.preventDefault(),
      onClick: (event: MouseEvent) => {
        if (!press.held()) onClick?.(event)
      },
    }
  }

  const view = () => dynamicChild(opened, request => (request ? portal(document.body, menuLayer(request, close)) : null))

  return { target, open, close, view }
}

export type ContextMenu = ReturnType<typeof contextMenu>
