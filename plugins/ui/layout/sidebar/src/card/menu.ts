import type { NavAction } from '@sand/nav/contract'
import type { Kit, PressAt } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { dynamicChild, portal, type Sig } from '@vaakx-dev/vrui'
import type { CardRow } from '../rows/build'

export interface CardMenu extends PressAt {
  row: CardRow
  ask?: string
  expand?: string
}

const subtitleOf = ({ item }: CardRow) => [item.project, tildeHome(item.path ?? '')].filter(Boolean).join(' · ')

export const actionMenu = ({ menuLayer }: Kit, request: Sig<CardMenu | undefined>, menuOf: (id: string) => NavAction[], close: () => void) =>
  dynamicChild(request, opened => {
    const actions = opened ? menuOf(opened.row.item.id) : []
    if (!opened || !actions.length) return null
    return portal(document.body, menuLayer({ ...opened, title: opened.row.item.title, subtitle: subtitleOf(opened.row), actions }, close))
  })
