import type { VersionTarget } from '@sand/host-plugin-versions/contract'
import { derive, div, list, settingsRow, settingsSection, show, span, type Sig } from '@sand/dom'
import type { VersionsSource } from './source'
import { historyToggle } from './versions'

const label = (target: VersionTarget) => (target.kind === 'setting' ? 'Default loop' : target.name)

const detail = (target: VersionTarget) => {
  if (!target.exists) return 'Deleted'
  return target.kind === 'setting' ? '~/.sand/loops.json' : ''
}

const targetRow = (source: VersionsSource, target: Sig<VersionTarget>) =>
  div(
    { class: 'flex flex-col bg-neutral-900' },
    settingsRow(
      span({ class: 'truncate', title: () => target.get().path }, () => label(target.get())),
      null,
      () => detail(target.get()),
    ),
    historyToggle(source, target.get().key),
  )

const targetSection = (source: VersionsSource, title: string, wanted: (target: VersionTarget) => boolean) => {
  const targets = derive(() => source.targets.get().filter(wanted))
  return show(
    derive(() => targets.get().length > 0),
    () =>
      settingsSection(
        { title },
        list(targets, target => target.key, target => targetRow(source, target), div({ class: 'contents' })),
      ),
  )
}

export const historySections = (source: VersionsSource) =>
  div(
    { class: 'contents' },
    targetSection(source, 'Hook files', target => target.kind === 'hook'),
    targetSection(source, 'Settings', target => target.kind === 'setting'),
    targetSection(source, 'Removed plugins', target => target.kind === 'plugin' && !target.exists),
  )
