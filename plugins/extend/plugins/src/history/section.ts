import type { VersionTarget } from '@sand/host-plugin-versions/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { VersionsSource } from './source'
import { historyToggle } from './versions'

const detail = (target: VersionTarget) => (target.exists ? '' : 'Deleted')

const targetRow = (kit: Kit, source: VersionsSource, target: Sig<VersionTarget>) => {
  const { settingsRow } = kit
  return div(
    { class: 'flex flex-col bg-neutral-900' },
    settingsRow(
      span({ class: 'truncate', title: () => target.get().path }, () => target.get().name),
      null,
      () => detail(target.get()),
    ),
    historyToggle(kit, source, target.get().key),
  )
}

const targetSection = (kit: Kit, source: VersionsSource, title: string, wanted: (target: VersionTarget) => boolean) => {
  const { rowList, settingsSection } = kit
  const targets = derive(() => source.targets.get().filter(wanted))
  return show(
    () => targets.get().length > 0,
    () =>
      settingsSection(
        { title },
        rowList(targets, target => target.key, target => targetRow(kit, source, target)),
      ),
  )
}

export const historySections = (kit: Kit, source: VersionsSource) =>
  div(
    { class: 'contents' },
    targetSection(kit, source, 'Removed plugins', target => !target.exists),
  )
