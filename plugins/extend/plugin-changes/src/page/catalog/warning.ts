import type { PluginEntry } from '@sand/host-plugin-library/contract'
import { div, quietButton, secondaryAction, span, type Child, type Sig } from '@sand/dom'

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

export const changedNote = (plugin: PluginEntry, actions: RowActions) =>
  div(
    { class: 'mx-4 mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-warning-950 px-3 py-2' },
    span({ class: 'min-w-0 flex-1 text-xs text-warning-400' }, 'The built-in changed since you customised it.'),
    quietButton({ size: 'sm', disabled: actions.busy, onClick: () => actions.keep(plugin) }, 'Keep mine'),
    secondaryAction({ size: 'sm', disabled: actions.busy, onClick: () => actions.ask(plugin) }, 'Ask sand'),
  )
