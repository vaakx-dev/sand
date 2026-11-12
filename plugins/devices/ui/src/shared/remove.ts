import type { MenuAction } from '@sand/ui-shell/contract'
import type { Ui } from '../ui'

export const removeAction = (ui: Ui, device: string): MenuAction => ({
  id: 'remove',
  label: 'Remove',
  icon: 'trash',
  danger: true,
  confirm: `Remove ${ui.data.nameOf(device)}? It stops being trusted until you add it again.`,
  run: () => ui.data.devices.remove(device),
})
