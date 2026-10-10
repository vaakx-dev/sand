import type { PaletteItem, PalettePage } from '../contract'

export const actionsPage = (item: PaletteItem): PalettePage => ({
  id: `actions:${item.id}`,
  title: item.label,
  placeholder: 'Search actions…',
  items: () =>
    (item.actions ?? []).map((action, index) => ({
      id: `action:${index}`,
      icon: action.icon,
      label: action.label,
      danger: action.danger,
      keepOpen: action.keepOpen,
      run: action.run,
    })),
})
