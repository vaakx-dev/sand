import { sessions } from '@sand/chats/contract'
import { backgroundJobs } from '@sand/jobs/contract'
import { shellRunner } from '@sand/shell/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { adoptCommands } from './adopt'
import { backgroundTool } from './tool'

export default definePlugin({
  name: 'shell-jobs',
  description: "Background commands: the run_background tool starts dev servers, watchers and long builds as jobs, and a fresh runtime takes over the ones still running when plugins reload",
  inject: { tools, sessions, backgroundJobs, shellRunner },
  apply(ctx) {
    ctx.effect(() => ctx.tools.register(backgroundTool(ctx, ctx.backgroundJobs, ctx.shellRunner, ctx.sessions)))
    ctx.effect(() => adoptCommands(ctx, { jobs: ctx.backgroundJobs, runner: ctx.shellRunner, sessions: ctx.sessions }))
  },
})
