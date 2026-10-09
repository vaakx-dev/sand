import type { NoticeLevel } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { hooksCommand } from './commands'
import { startHooks, type HooksRuntime } from './start'

export default definePlugin({
  name: 'hooks',
  description: 'Runs hook files from the sand home and trusted projects at each turn, step and tool call',
  inject: ['cli', 'paths', 'watcher'],
  uses: {
    ui: 'no trust prompt for project hooks, no notices and no /hooks command',
    inspector: '/hooks trace has no timings',
  },
  apply(ctx) {
    const notify = (text: string, level?: NoticeLevel) => ctx.ui?.notify(text, level)
    let runtime: HooksRuntime | undefined
    if (ctx.cli.safe) {
      let told = false
      ctx.watch('ui', ui => {
        if (!ui || told) return
        told = true
        ui.notify('Hooks are off in safe mode')
      })
    } else {
      runtime = startHooks(ctx, notify)
      ctx.provide('hooks', runtime.service)
    }
    ctx.watch('ui', ui => ui && hooksCommand(ui, runtime, () => ctx.inspector))
  },
})
