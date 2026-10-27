import type { Kit } from '@sand/ui-kit/contract'
import type { Sig } from '@vaakx-dev/vrui'
import type { Connection } from './contract'
import { connectionRow } from './row'

export const connectionsPage = (kit: Kit, entries: Sig<Connection[]>) => {
  const { rowList, settingsSection } = kit
  return settingsSection(
    {},
    rowList(entries, entry => entry.id, entry => connectionRow(kit, entry)),
  )
}
