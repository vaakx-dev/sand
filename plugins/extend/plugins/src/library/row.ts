import type { PluginEntry, PluginOrigin } from '@sand/host-plugin-library/contract'
import type { Kit, Tone } from '@sand/ui-kit/contract'
import { div, show, sig, span, type Child, type Sig } from '@vaakx-dev/vrui'
import { originLabels } from './filter'
import { pluginMenu } from './menu'

export interface RowActions {
  busy: () => boolean
  failure(name: string): string | undefined
  history(key: string, open: Sig<boolean>): Child
  hasHistory(key: string): boolean
  copy(text: string): () => Promise<boolean>
  customise(plugin: PluginEntry): void
  restore(plugin: PluginEntry): void
  keep(plugin: PluginEntry): void
}

const tones: Record<PluginOrigin, Tone> = { builtin: 'neutral', customised: 'accent', yours: 'success' }

const control = ({ rowAction, secondaryAction }: Kit, plugin: PluginEntry, actions: RowActions) => {
  if (plugin.origin === 'customised') return rowAction({ label: 'Use built-in', danger: true, disabled: actions.busy, run: () => actions.restore(plugin) })
  if (plugin.origin === 'builtin')
    return secondaryAction({ size: 'sm', disabled: actions.busy, onClick: () => actions.customise(plugin) }, 'Customise')
  return null
}

const detail = (plugin: PluginEntry) => {
  if (plugin.origin === 'customised') return `Your copy replaces the built-in${plugin.from?.version ? ` from sand ${plugin.from.version}` : ''}`
  return plugin.description ?? ''
}

const changedNote = ({ quietButton, rowWarning, secondaryAction }: Kit, plugin: PluginEntry, actions: RowActions) =>
  rowWarning(
    'The built-in changed since you customised it.',
    quietButton({ size: 'sm', disabled: actions.busy, onClick: () => actions.keep(plugin) }, 'Keep mine'),
    secondaryAction({ size: 'sm', disabled: actions.busy, onClick: () => actions.restore(plugin) }, 'Use built-in'),
  )

const failureNote = ({ errorText }: Kit, plugin: PluginEntry, actions: RowActions) =>
  show(
    () => actions.failure(plugin.name) !== undefined,
    () => div({ class: 'px-4 pb-3 font-mono' }, errorText(() => actions.failure(plugin.name) ?? '')),
  )

export const pluginRow = (kit: Kit, plugin: PluginEntry, actions: RowActions) => {
  const { badge, contextMenu, settingsRow } = kit
  const menu = contextMenu()
  const history = sig(false)
  return div(
    { class: 'flex flex-col bg-neutral-900' },
    div(
      { class: 'flex flex-col', ...menu.target(() => pluginMenu(plugin, actions, history)) },
      menu.view(),
      settingsRow(
        span(
          { class: 'flex min-w-0 items-center gap-2' },
          span({ class: 'truncate', title: plugin.folder }, plugin.name),
          badge(tones[plugin.origin], originLabels[plugin.origin]),
          show(
            () => actions.failure(plugin.name) !== undefined,
            () => badge('danger', 'Not loaded'),
          ),
        ),
        control(kit, plugin, actions),
        detail(plugin),
      ),
      plugin.changed ? changedNote(kit, plugin, actions) : null,
      failureNote(kit, plugin, actions),
    ),
    plugin.origin === 'builtin' ? null : actions.history(`plugins/${plugin.name}`, history),
  )
}
