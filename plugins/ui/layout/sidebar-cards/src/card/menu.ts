import { dynamicChild, menuLayer, portal, tildeHome, type PressAt, type Sig } from '@sand/dom'
import type { CardRow } from '../rows/build'

export interface MenuRequest extends PressAt {
  row: CardRow
  ask?: string
  expand?: string
}

const subtitleOf = ({ item }: CardRow) => [item.project, tildeHome(item.path ?? '')].filter(Boolean).join(' · ')

export const actionMenu = (request: Sig<MenuRequest | undefined>, close: () => void) =>
  dynamicChild(request, opened => {
    const actions = opened?.row.list.menu?.(opened.row.item.id) ?? []
    if (!opened || !actions.length) return null
    return portal(document.body, menuLayer({ ...opened, title: opened.row.item.title, subtitle: subtitleOf(opened.row), actions }, close))
  })
