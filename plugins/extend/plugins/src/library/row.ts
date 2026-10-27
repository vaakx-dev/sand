import type { PluginEntry } from '@sand/host-plugin-library/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { show, sig, type Child, type Sig } from '@vaakx-dev/vrui'
import { originLabels } from './filter'
import { pluginMenu } from './menu'

export interface RowActions {
  busy: () => boolean
  failure(name: string): string | undefined
  historyToggle(key: string, open: Sig<boolean>): Child
  historyDetail(key: string, open: Sig<boolean>): Child
  hasHistory(key: string): boolean
  copy(text: string): () => Promise<boolean>
  customise(plugin: PluginEntry): void
  restore(plugin: PluginEntry): void
  keep(plugin: PluginEntry): void
}

const control = ({ quietButton, rowAction }: Kit, plugin: PluginEntry, actions: RowActions) => {
  if (plugin.origin === 'builtin') return quietButton({ size: 'sm', surface: 'group', disabled: actions.busy, onClick: () => actions.customise(plugin) }, 'Customise')
  if (plugin.origin === 'customised' && !plugin.changed) return rowAction({ label: 'Use built-in', danger: true, disabled: actions.busy, run: () => actions.restore(plugin) })
  return null
}

const detail = (plugin: PluginEntry) =>
  plugin.origin === 'customised'
    ? `Your copy in ${tildeHome(plugin.folder)} replaces the built-in. Press Reload plugins after editing it.`
    : (plugin.description ?? '')

const changedNote = ({ quietButton, rowAction, rowWarning }: Kit, plugin: PluginEntry, actions: RowActions) =>
  rowWarning(
    'The built-in changed since you customised it.',
    quietButton({ size: 'sm', disabled: actions.busy, onClick: () => actions.keep(plugin) }, 'Keep mine'),
    rowAction({ label: 'Use built-in', danger: true, disabled: actions.busy, run: () => actions.restore(plugin) }),
  )

const failureNote = ({ codeBlock, rowDetail }: Kit, plugin: PluginEntry, actions: RowActions) => {
  const failure = () => actions.failure(plugin.name) ?? ''
  return show(
    () => actions.failure(plugin.name) !== undefined,
    () => rowDetail(codeBlock({ danger: true, copy: failure }, failure)),
  )
}

const marks = ({ badge }: Kit, plugin: PluginEntry, actions: RowActions) => [
  plugin.origin === 'builtin' ? null : badge('neutral', originLabels[plugin.origin]),
  show(
    () => actions.failure(plugin.name) !== undefined,
    () => badge('danger', "Couldn't load"),
  ),
]

export const pluginRow = (kit: Kit, plugin: PluginEntry, actions: RowActions) => {
  const { contextMenu, expandRow, settingsRow } = kit
  const menu = contextMenu()
  const history = sig(false)
  const key = `plugins/${plugin.name}`
  const tracked = plugin.origin !== 'builtin'
  return expandRow(
    {},
    menu.view(),
    settingsRow(
      { ...menu.target(() => pluginMenu(plugin, actions, history)), title: plugin.name, detail: detail(plugin) },
      ...marks(kit, plugin, actions),
      tracked ? actions.historyToggle(key, history) : null,
      control(kit, plugin, actions),
    ),
    plugin.changed ? changedNote(kit, plugin, actions) : null,
    failureNote(kit, plugin, actions),
    tracked ? actions.historyDetail(key, history) : null,
  )
}
