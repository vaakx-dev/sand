import { copyBox, field } from '../shared/parts'
import { clockWords } from '../shared/time'
import type { Ui } from '../ui'

export const commandSheet = (ui: Ui, install: string, close: () => void) => {
  const { emptyState, overlay, primaryAction, sheet, sheetBody, sheetFoot, sheetHead, sheetText } = ui.kit
  const grant = ui.data.installs.grants.get().find(entry => entry.id === install)
  return overlay(
    close,
    sheet(
      { 'aria-label': 'Install command', size: 'md' },
      sheetHead({ title: 'Install sand on a new PC', close }),
      sheetBody(
        {},
        grant
          ? field('Run this on the new PC', copyBox(ui.kit, grant.command))
          : emptyState({ text: 'This command is no longer here. Make a new one with Add a PC.' }),
        grant ? sheetText(`It works once, until ${clockWords(grant.expires)}. Progress shows in your PCs list.`) : null,
      ),
      sheetFoot(primaryAction({ onClick: close }, 'Done')),
    ),
  )
}
