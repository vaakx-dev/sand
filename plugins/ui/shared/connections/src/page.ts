import type { Kit } from '@sand/ui-kit/contract'
import { div, type Sig } from '@vaakx-dev/vrui'
import type { Connection } from './contract'
import { connectionRow } from './row'

export const connectionsPage = (kit: Kit, entries: Sig<Connection[]>) => {
  const { pageHead, rowList, settingsSection } = kit
  return div(
    { class: 'flex flex-col gap-6' },
    pageHead('Outside services and tools that sand works with.', null),
    settingsSection(
      {},
      rowList(entries, entry => entry.id, entry => connectionRow(kit, entry)),
    ),
  )
}
