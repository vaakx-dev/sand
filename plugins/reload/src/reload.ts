import type { Command } from '@sand/protocol'
import type { Context } from 'drydock'
import { reloadAll, reloadPlugin } from './reloading'

export const reloadCommand = (ctx: Context<'ui'>): Command => ({
  name: 'reload',
  title: 'Reload plugins',
  description: 'Reload all plugins from disk, or one by name',
  args: '[plugin]',
  run(args) {
    const name = args.trim()
    const scope = ctx.scopes().find(candidate => candidate.kind === 'plugin' && candidate.source && candidate.name === name)
    if (name && !scope) return ctx.ui.notify(`No plugin named ${name}`, 'error')
    setTimeout(() => (scope ? reloadPlugin(ctx, scope) : reloadAll(ctx)))
  },
})
