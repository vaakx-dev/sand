import type { SheetSpec } from '@sand/ui-shell/contract'
import { copyBox } from '../shared/parts'
import { clockWords } from '../shared/time'
import type { Ui } from '../ui'

export const commandSheet = (ui: Ui, install: string, close: () => void): SheetSpec => {
  const { emptyState, sheetText } = ui.kit
  const grant = ui.data.installs.grants.get().find(entry => entry.id === install)
  return {
    label: 'Install command',
    title: 'Install sand on a new PC',
    body: () => [
      grant
        ? ui.kit.field({ label: 'Run this on the new PC' }, copyBox(ui.kit, grant.command))
        : emptyState({ text: 'This command is no longer here. Make a new one with Add a PC.' }),
      grant ? sheetText(`It works once, until ${clockWords(grant.expires)}. Progress shows in your PCs list.`) : null,
    ],
    onClose: close,
  }
}
