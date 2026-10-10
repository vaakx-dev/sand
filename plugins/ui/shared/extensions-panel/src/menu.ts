import type { MenuSpec, NavAction } from '@sand/dom'
import type { CardModel } from './card'

export const extensionMenu = ({ extension, locked }: CardModel, toggle: () => void, copyId: () => void): MenuSpec => ({
  title: extension.id,
  subtitle: extension.description,
  actions: [
    ...(locked
      ? []
      : [{ id: 'toggle', label: extension.configured ? 'Disable' : 'Enable', icon: extension.configured ? 'x' : 'check', group: 'toggle', run: toggle } satisfies NavAction]),
    { id: 'copy-id', label: 'Copy id', icon: 'copy', group: 'copy', run: copyId },
  ],
})
