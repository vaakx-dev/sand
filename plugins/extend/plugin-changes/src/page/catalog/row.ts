import type { PluginEntry, PluginOrigin } from '@sand/protocol'
import { badge, div, rowAction, secondaryAction, settingsRow, span, type Tone } from '@sand/dom'
import { originLabels } from './filter'
import { changedNote, type RowActions } from './warning'

const tones: Record<PluginOrigin, Tone> = { builtin: 'neutral', customised: 'accent', yours: 'success' }

const control = (plugin: PluginEntry, actions: RowActions) => {
  if (plugin.origin === 'customised') return rowAction({ label: 'Use built-in', danger: true, run: () => actions.restore(plugin) })
  if (plugin.origin === 'builtin')
    return secondaryAction({ size: 'sm', disabled: actions.busy, onClick: () => actions.customise(plugin) }, 'Customise')
  return null
}

const detail = (plugin: PluginEntry) => {
  if (plugin.origin === 'customised') return `Your copy replaces the built-in${plugin.from?.version ? ` from sand ${plugin.from.version}` : ''}`
  return plugin.description ?? ''
}

export const pluginRow = (plugin: PluginEntry, actions: RowActions) =>
  div(
    { class: 'flex flex-col bg-neutral-900' },
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
  )
