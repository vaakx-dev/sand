import type { Version, VersionSource, VersionTarget } from '@sand/host-plugin-versions/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import type { Kit, MenuSpec } from '@sand/ui-kit/contract'
import { exactTime } from '@sand/util'
import { derive, div, dynamicChild, list, show, span, type Sig } from '@vaakx-dev/vrui'
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
  const { choiceCheck, contextMenu, metaLine, quietButton, rowTitle } = kit
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
    const restoreAction: MenuAction = { id: 'restore', label: 'Restore', icon: 'reload', group: 'version', run: restore }
    return {
      title: exactTime(at),
      subtitle: sources[from],
      actions: [...(current.get() || busy() ? [] : [restoreAction]), { id: 'copy-hash', label: 'Copy hash', icon: 'copy', group: 'copy', run: source.copy(hash) }],
    }
  }
  return div(
    { class: 'flex min-h-8 items-center gap-3', ...menu.target(spec) },
    menu.view(),
    div(
      { class: 'flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2' },
      span({ class: 'tabular-nums' }, rowTitle(() => exactTime(version.get().at))),
      metaLine(() => sources[version.get().source]),
    ),
    show(good, () => metaLine('Last good start')),
    dynamicChild(current, isCurrent =>
      isCurrent ? choiceCheck(true) : quietButton({ size: 'sm', disabled: busy, onClick: restore }, 'Restore'),
    ),
    menu.button(spec, { size: 'sm' }),
  )
}

const versionsOf = (source: VersionsSource, key: string) => {
  const target = source.target(key)
  return { target, versions: derive(() => target.get()?.versions ?? []) }
}

export const historyToggle = (kit: Kit, source: VersionsSource, key: string, open: Sig<boolean>) => {
  const { versions } = versionsOf(source, key)
  return show(
    () => versions.get().length > 0,
    () => kit.expandToggle(open, ['History', kit.countMark(() => versions.get().length)]),
  )
}

export const historyDetail = (kit: Kit, source: VersionsSource, key: string, open: Sig<boolean>) => {
  const { target, versions } = versionsOf(source, key)
  return show(
    () => open.get() && versions.get().length > 0,
    () =>
      kit.rowDetail(
        list(
          versions,
          version => version.id,
          version => versionRow(kit, source, () => target.get(), version),
          div({ class: 'flex flex-col' }),
        ),
      ),
  )
}
