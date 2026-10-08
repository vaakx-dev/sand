import type { Command } from '@sand/protocol'
import type { Context, ScopeNode } from 'drydock'

const tree = (node: ScopeNode, depth = 0): string[] => [
  `${'  '.repeat(depth)}${node.name}${node.status === 'active' ? '' : ` [${node.status}]`}${node.error ? ` ${node.error.split('\n')[0]}` : ''}`,
  ...node.children.flatMap(child => tree(child, depth + 1)),
]

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
