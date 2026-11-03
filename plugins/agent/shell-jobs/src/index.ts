import { backgroundJobs } from '@sand/jobs/contract'
import { shellRunner } from '@sand/shell/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { backgroundTool } from './tool'

export default definePlugin({
  name: 'shell-jobs',
  description: 'Background commands: the run_background tool starts dev servers, watchers and long builds as jobs, and unloading kills them',
  inject: { tools, backgroundJobs, shellRunner },
  apply(ctx) {
    ctx.effect(() => ctx.tools.register(backgroundTool(ctx, ctx.backgroundJobs, ctx.shellRunner)))
    ctx.effect(() => () => {
      for (const job of ctx.backgroundJobs.list()) if (job.kind === 'command' && job.status === 'running') job.cancel()
    })
  },
})
