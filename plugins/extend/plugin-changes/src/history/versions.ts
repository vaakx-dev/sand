import type { Version, VersionSource, VersionTarget } from '@sand/host-plugin-versions/contract'
import { badge, chevron, derive, div, exactTime, list, quietButton, secondaryAction, show, sig, span, type Sig } from '@sand/dom'
import type { VersionsSource } from './source'

const sources: Record<VersionSource, string> = {
  start: 'Found at start',
  edit: 'Edited',
  customise: 'Customised',
  restore: 'Restored',
  sync: 'From another PC',
  'auto-restore': 'Brought back after a failed start',
}

const versionRow = (source: VersionsSource, target: () => VersionTarget, version: Sig<Version>) => {
  const current = derive(() => target().current === version.get().id)
  const good = derive(() => target().good === version.get().id)
  return div(
    { class: 'flex min-h-8 flex-wrap items-center gap-3 px-2 text-xs' },
    span({ class: 'tabular-nums text-neutral-300' }, () => exactTime(version.get().at)),
    span({ class: 'text-neutral-500' }, () => sources[version.get().source]),
    span({ class: 'tabular-nums text-neutral-500', title: () => version.get().hash }, () => version.get().hash.slice(0, 7)),
    show(current, () => badge('accent', 'Current')),
    show(good, () => badge('success', 'Last good start')),
    span({ class: 'flex-1' }),
    secondaryAction(
      {
        size: 'sm',
        disabled: () => current.get() || source.busy.get() !== undefined,
        onClick: () => void source.restore(target(), version.get()),
      },
      'Restore',
    ),
  )
}

export const historyToggle = (source: VersionsSource, key: string) => {
  const target = source.target(key)
  const open = sig(false)
  const versions = derive(() => target.get()?.versions ?? [])
  return show(
    derive(() => versions.get().length > 0),
    () =>
      div(
        { class: 'flex flex-col px-2 pb-2' },
        div(
          quietButton(
            { size: 'sm', 'aria-expanded': open, onClick: () => open.set(!open.get()) },
            chevron(() => open.get(), 12),
            () => `History · ${versions.get().length}`,
          ),
        ),
        show(open, () =>
          list(
            versions,
            version => version.id,
            version => versionRow(source, () => target.get()!, version),
            div({ class: 'flex flex-col' }),
          ),
        ),
      ),
  )
}
