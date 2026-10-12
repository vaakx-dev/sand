import { tildeHome } from '@sand/kit'
import type { PressAt } from '@sand/protocol'
import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, portal, type Sig } from '@vaakx-dev/vrui'
import type { CardRow } from '../rows/build'

export interface CardMenu extends PressAt {
  row: CardRow
  ask?: string
  expand?: string
}

const subtitleOf = ({ item }: CardRow) => [item.project, tildeHome(item.path ?? '')].filter(Boolean).join(' · ')

export const actionMenu = ({ menuLayer }: Kit, request: Sig<CardMenu | undefined>, close: () => void) =>
  dynamicChild(request, opened => {
    const actions = opened?.row.list.menu?.(opened.row.item.id) ?? []
    if (!opened || !actions.length) return null
    return portal(document.body, menuLayer({ ...opened, title: opened.row.item.title, subtitle: subtitleOf(opened.row), actions }, close))
  })
