import type { PaletteItem, PaletteItemAction } from '../contract'
import type { MenuSpec } from '@sand/dom'

export const itemMenu = (item: PaletteItem, runAction: (action: PaletteItemAction) => Promise<void>): MenuSpec => ({
  title: item.label,
  subtitle: item.detail,
  actions: (item.actions ?? []).map((action, index) => ({
    id: `action:${index}`,
    label: action.label,
    icon: action.icon,
    danger: action.danger,
    run: () => runAction(action),
  })),
})
