import type { Command } from '@sand/protocol'
import type { Context } from 'drydock'

export const reloadCommand = (ctx: Context<'ui' | 'runtime'>): Command => ({
  name: 'reload',
  title: 'Reload plugins',
  description: 'Start a fresh runtime with all plugins reloaded from disk',
  run() {
    ctx.runtime.swap()
    ctx.ui.notify('↻ starting a fresh runtime; running turns finish on the old one')
  },
})
