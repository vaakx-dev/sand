import type { VersionTarget } from '@sand/host-plugin-versions/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, show, sig, type Sig } from '@vaakx-dev/vrui'
import type { VersionsSource } from './source'
import { historyDetail, historyToggle } from './versions'

const targetRow = (kit: Kit, source: VersionsSource, target: Sig<VersionTarget>) => {
  const { expandRow, settingsRow } = kit
  const open = sig(false)
  const key = target.get().key
  return expandRow(
    {},
    settingsRow({ title: () => target.get().name }, historyToggle(kit, source, key, open)),
    historyDetail(kit, source, key, open),
  )
}

export const historySections = (kit: Kit, source: VersionsSource) => {
  const { rowList, settingsSection } = kit
  const removed = derive(() => source.targets.get().filter(target => !target.exists))
  return show(
    () => removed.get().length > 0,
    () =>
      settingsSection(
        { title: 'Removed plugins' },
        rowList(removed, target => target.key, target => targetRow(kit, source, target)),
      ),
  )
}
