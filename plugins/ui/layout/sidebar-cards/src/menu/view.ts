import { dynamicChild, menuLayer, portal, span, tildeHome, type PressAt, type Sig } from '@sand/dom'
import type { CardRow } from '../card'

export interface MenuRequest extends PressAt {
  row: CardRow
  ask?: string
  expand?: string
}

const subtitleOf = ({ item }: CardRow) => [item.project, tildeHome(item.path ?? '')].filter(Boolean).join(' · ')

export const actionMenu = (request: Sig<MenuRequest | undefined>, close: () => void) =>
  dynamicChild(request, opened => {
    const actions = opened?.row.list.menu?.(opened.row.item.id) ?? []
    if (!opened || !actions.length) return span({ hidden: true })
    const layer = menuLayer({ ...opened, title: opened.row.item.title, subtitle: subtitleOf(opened.row), actions }, close)
    return span({ hidden: true }, portal(document.body, layer))
  })
