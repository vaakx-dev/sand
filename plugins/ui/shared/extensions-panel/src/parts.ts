import type { ExtensionInfo } from '@sand/web/contract'
import { settingsRow, span, toggleSwitch } from '@sand/dom'

export const partRow = (extension: ExtensionInfo, toggle: () => void) =>
  settingsRow(
    span({ title: extension.summary ?? '' }, extension.label ?? extension.id),
    toggleSwitch({ on: extension.configured, title: extension.configured ? 'Turn off' : 'Turn on', onClick: toggle }),
  )
