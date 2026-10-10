import { dynamicChild, portal, span, type Sig } from '@sand/dom'
import type { CardRow } from '../card'
import { menuPopup } from './popup'
import type { PressAt } from './press'
import { menuSheet } from './sheet'

export interface MenuRequest extends PressAt {
  row: CardRow
  ask?: string
  expand?: string
}

export const actionMenu = (request: Sig<MenuRequest | undefined>, close: () => void) =>
  dynamicChild(request, opened => {
    const actions = opened?.row.list.menu?.(opened.row.item.id) ?? []
    if (!opened || !actions.length) return span({ hidden: true })
    return span({ hidden: true }, portal(document.body, (opened.touch ? menuSheet : menuPopup)(opened, actions, close)))
  })
