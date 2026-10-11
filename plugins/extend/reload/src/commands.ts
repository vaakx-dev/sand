import type { Command } from '@sand/server/contract'
import type { Context, ScopeNode } from 'drydock'

const tree = (node: ScopeNode, depth = 0): string[] => [
  `${'  '.repeat(depth)}${node.name}${node.status === 'active' ? '' : ` [${node.status}]`}${node.error ? ` ${node.error.split('\n')[0]}` : ''}`,
  ...node.children.flatMap(child => tree(child, depth + 1)),
]

export const reloadCommand = (ctx: Context<'ui' | 'runtime'>): Command => ({
  name: 'reload',
  title: 'Reload plugins',
  description: 'Start a fresh runtime with all plugins reloaded from disk',
  run() {
    ctx.runtime.swap()
    ctx.ui.notify('↻ starting a fresh runtime; running turns finish on the old one')
  },
})

export const pluginsCommand = (ctx: Context<'ui'>): Command => ({
  name: 'plugins',
  title: 'Plugin tree',
  description: 'Show the plugin tree',
  run() {
    const inspector = ctx.inspector
    if (!inspector) return ctx.ui.notify('The inspector plugin is not loaded', 'error')
    ctx.ui.report('Plugins', [{ kind: 'text', text: tree(inspector.tree()).join('\n'), mono: true }])
  },
})
