import type { PluginEntry } from '@sand/host-plugin-library/contract'
import type { MenuSpec, NavAction, Sig } from '@sand/dom'
import { originLabels } from './filter'
import type { RowActions } from './warning'

const history = (plugin: PluginEntry, actions: RowActions, open: Sig<boolean>): NavAction[] =>
  plugin.origin !== 'builtin' && actions.hasHistory(`plugins/${plugin.name}`)
    ? [{ id: 'history', label: open.get() ? 'Hide history' : 'Show history', icon: 'clock', group: 'history', run: () => open.set(!open.get()) }]
    : []

const change = (plugin: PluginEntry, actions: RowActions): NavAction[] => {
  const when = (run: () => void) => () => {
    if (!actions.busy()) run()
  }
  const found: NavAction[] = []
  if (plugin.origin === 'builtin') found.push({ id: 'customise', label: 'Customise', icon: 'duplicate', group: 'change', run: when(() => actions.customise(plugin)) })
  if (plugin.origin === 'customised')
    found.push({ id: 'restore', label: 'Use built-in', icon: 'reload', group: 'change', danger: true, run: when(() => actions.restore(plugin)) })
  if (plugin.changed) {
    found.push({ id: 'keep', label: 'Keep mine', icon: 'check', group: 'change', run: when(() => actions.keep(plugin)) })
    found.push({ id: 'ask', label: 'Ask sand', icon: 'sparkles', group: 'change', run: when(() => actions.ask(plugin)) })
  }
  return found
}

export const pluginMenu = (plugin: PluginEntry, actions: RowActions, open: Sig<boolean>): MenuSpec => ({
  title: plugin.name,
  subtitle: originLabels[plugin.origin],
  actions: [
    ...change(plugin, actions),
    ...history(plugin, actions, open),
    { id: 'copy-path', label: 'Copy folder path', icon: 'folder', group: 'copy', run: actions.copy(plugin.folder, 'folder path') },
  ],
})
