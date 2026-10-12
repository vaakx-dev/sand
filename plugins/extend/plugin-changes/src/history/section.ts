import type { VersionTarget } from '@sand/host-plugin-versions/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, show, span, type Sig } from '@vaakx-dev/vrui'
import type { VersionsSource } from './source'
import { historyToggle } from './versions'

const label = (target: VersionTarget) => (target.kind === 'setting' ? 'Default loop' : target.name)

const detail = (target: VersionTarget) => {
  if (!target.exists) return 'Deleted'
  return target.kind === 'setting' ? '~/.sand/loops.json' : ''
}

const targetRow = (kit: Kit, source: VersionsSource, target: Sig<VersionTarget>) => {
  const { settingsRow } = kit
  return div(
    { class: 'flex flex-col bg-neutral-900' },
    settingsRow(
      span({ class: 'truncate', title: () => target.get().path }, () => label(target.get())),
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
    targetSection(kit, source, 'Hook files', target => target.kind === 'hook'),
    targetSection(kit, source, 'Settings', target => target.kind === 'setting'),
    targetSection(kit, source, 'Removed plugins', target => target.kind === 'plugin' && !target.exists),
  )
