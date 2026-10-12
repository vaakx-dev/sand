import type { Version, VersionSource, VersionTarget } from '@sand/host-plugin-versions/contract'
import { exactTime } from '@sand/kit'
import type { MenuSpec, NavAction } from '@sand/protocol'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, list, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import type { VersionsSource } from './source'

const sources: Record<VersionSource, string> = {
  start: 'Found at start',
  edit: 'Edited',
  customise: 'Customised',
  restore: 'Restored',
  sync: 'From another PC',
  'auto-restore': 'Brought back after a failed start',
}

const versionRow = (kit: Kit, source: VersionsSource, target: () => VersionTarget | undefined, version: Sig<Version>) => {
  const { badge, contextMenu, secondaryAction } = kit
  const current = derive(() => target()?.current === version.get().id)
  const good = derive(() => target()?.good === version.get().id)
  const busy = () => source.busy.get() !== undefined
  const restore = () => {
    const found = target()
    if (found) void source.restore(found, version.get())
  }
  const menu = contextMenu()
  const spec = (): MenuSpec => {
    const { at, hash, source: from } = version.get()
    const restoreAction: NavAction = { id: 'restore', label: 'Restore', icon: 'reload', group: 'version', run: restore }
    return {
      title: exactTime(at),
      subtitle: sources[from],
      actions: [
        ...(current.get() || busy() ? [] : [restoreAction]),
        { id: 'copy-hash', label: 'Copy hash', icon: 'copy', group: 'copy', run: source.copy(hash, 'hash') },
      ],
    }
  }
  return div(
    { class: 'flex min-h-8 flex-wrap items-center gap-3 px-2 text-xs', ...menu.target(spec) },
    menu.view(),
    span({ class: 'tabular-nums text-neutral-300' }, () => exactTime(version.get().at)),
    span({ class: 'text-neutral-500' }, () => sources[version.get().source]),
    span({ class: 'tabular-nums text-neutral-500', title: () => version.get().hash }, () => version.get().hash.slice(0, 7)),
    show(current, () => badge('accent', 'Current')),
    show(good, () => badge('success', 'Last good start')),
    span({ class: 'flex-1' }),
    secondaryAction({ size: 'sm', disabled: () => current.get() || busy(), onClick: restore }, 'Restore'),
  )
}

export const historyToggle = (kit: Kit, source: VersionsSource, key: string, open: Sig<boolean> = sig(false)) => {
  const { chevron, quietButton } = kit
  const target = source.target(key)
  const versions = derive(() => target.get()?.versions ?? [])
  return show(
    () => versions.get().length > 0,
    () =>
      div(
        { class: 'flex flex-col px-2 pb-2' },
        div(
          quietButton(
            { size: 'sm', 'aria-expanded': open, onClick: open.toggle() },
            chevron(() => open.get(), 12),
            () => `History · ${versions.get().length}`,
          ),
        ),
        show(open, () =>
          list(
            versions,
            version => version.id,
            version => versionRow(kit, source, () => target.get(), version),
            div({ class: 'flex flex-col' }),
          ),
        ),
      ),
  )
}
