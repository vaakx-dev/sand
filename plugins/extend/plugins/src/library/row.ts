import type { PluginEntry } from '@sand/host-plugin-library/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { div, show, sig, type Child, type Sig } from '@vaakx-dev/vrui'
import { originLabels } from './filter'
import { pluginMenu, restoreAction } from './menu'

export interface RowActions {
  busy: () => boolean
  failure(name: string): string | undefined
  offNeeds(name: string): string[] | undefined
  historyToggle(key: string, open: Sig<boolean>): Child
  historyDetail(key: string, open: Sig<boolean>): Child
  hasHistory(key: string): boolean
  copy(text: string): () => Promise<boolean>
  customise(plugin: PluginEntry): void
  restore(plugin: PluginEntry): Promise<unknown>
  keep(plugin: PluginEntry): void
}

const restoreButton = ({ confirmButton }: Kit, plugin: PluginEntry, actions: RowActions) => confirmButton({ action: restoreAction(plugin, actions), disabled: actions.busy })

const control = (kit: Kit, plugin: PluginEntry, actions: RowActions) => {
  const { quietButton } = kit
  if (plugin.origin === 'builtin') return quietButton({ size: 'sm', disabled: actions.busy, onClick: () => actions.customise(plugin) }, 'Customise')
  if (plugin.origin === 'customised' && !plugin.changed) return restoreButton(kit, plugin, actions)
  return null
}

const detail = (plugin: PluginEntry) =>
  plugin.origin === 'customised'
    ? `Your copy in ${tildeHome(plugin.folder)} replaces the built-in. Press Reload plugins after editing it.`
    : (plugin.description ?? '')

const changedNote = (kit: Kit, plugin: PluginEntry, actions: RowActions) =>
  kit.rowWarning(
    'The built-in changed since you customised it.',
    kit.quietButton({ size: 'sm', disabled: actions.busy, onClick: () => actions.keep(plugin) }, 'Keep mine'),
    restoreButton(kit, plugin, actions),
  )

const failureNote = ({ codeBlock, rowDetail }: Kit, plugin: PluginEntry, actions: RowActions) => {
  const failure = () => actions.failure(plugin.name) ?? ''
  return show(
    () => actions.failure(plugin.name) !== undefined,
    () => rowDetail(codeBlock({ danger: true, copy: failure }, () => tildeHome(failure()))),
  )
}

const offReason = (plugin: PluginEntry, actions: RowActions) => {
  const needs = () => actions.offNeeds(plugin.name) ?? []
  return show(
    () => needs().length > 0,
    () => div(() => `Off because it needs ${needs().join(', ')}, which sand.toml turns off.`),
  )
}

const marks = ({ badge, metaLine }: Kit, plugin: PluginEntry, actions: RowActions) => [
  plugin.origin === 'builtin' ? null : metaLine(originLabels[plugin.origin]),
  show(
    () => actions.offNeeds(plugin.name) !== undefined,
    () => metaLine('Off'),
  ),
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
  const spec = () => pluginMenu(plugin, actions, history)
  return expandRow(
    {},
    menu.view(),
    settingsRow(
      { ...menu.target(spec), title: plugin.name, detail: [detail(plugin), offReason(plugin, actions)] },
      ...marks(kit, plugin, actions),
      tracked ? actions.historyToggle(key, history) : null,
      control(kit, plugin, actions),
      menu.button(spec),
    ),
    plugin.changed ? changedNote(kit, plugin, actions) : null,
    failureNote(kit, plugin, actions),
    tracked ? actions.historyDetail(key, history) : null,
  )
}
