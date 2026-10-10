import type { PluginEntry, PluginOrigin } from '@sand/host-plugin-library/contract'
import { badge, contextMenu, div, quietButton, rowAction, rowWarning, secondaryAction, settingsRow, sig, span, type Child, type Sig, type Tone } from '@sand/dom'
import { originLabels } from './filter'
import { pluginMenu } from './menu'

export interface RowActions {
  busy: () => boolean
  history(key: string, open: Sig<boolean>): Child
  hasHistory(key: string): boolean
  copy(text: string, what: string): () => Promise<void>
  customise(plugin: PluginEntry): void
  restore(plugin: PluginEntry): void
  keep(plugin: PluginEntry): void
  ask(plugin: PluginEntry): void
}

const tones: Record<PluginOrigin, Tone> = { builtin: 'neutral', customised: 'accent', yours: 'success' }

const control = (plugin: PluginEntry, actions: RowActions) => {
  if (plugin.origin === 'customised') return rowAction({ label: 'Use built-in', danger: true, disabled: actions.busy, run: () => actions.restore(plugin) })
  if (plugin.origin === 'builtin')
    return secondaryAction({ size: 'sm', disabled: actions.busy, onClick: () => actions.customise(plugin) }, 'Customise')
  return null
}

const detail = (plugin: PluginEntry) => {
  if (plugin.origin === 'customised') return `Your copy replaces the built-in${plugin.from?.version ? ` from sand ${plugin.from.version}` : ''}`
  return plugin.description ?? ''
}

const changedNote = (plugin: PluginEntry, actions: RowActions) =>
  rowWarning(
    'The built-in changed since you customised it.',
    quietButton({ size: 'sm', disabled: actions.busy, onClick: () => actions.keep(plugin) }, 'Keep mine'),
    secondaryAction({ size: 'sm', disabled: actions.busy, onClick: () => actions.ask(plugin) }, 'Ask sand'),
  )

export const pluginRow = (plugin: PluginEntry, actions: RowActions) => {
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
        ),
        control(plugin, actions),
        detail(plugin),
      ),
      plugin.changed ? changedNote(plugin, actions) : null,
    ),
    plugin.origin === 'builtin' ? null : actions.history(`plugins/${plugin.name}`, history),
  )
}
