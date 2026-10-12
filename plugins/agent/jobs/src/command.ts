import { definePlugin } from 'drydock'
import { ago } from '@sand/kit'

export const jobsUI = definePlugin({
  name: 'jobs-ui',
  inject: ['ui', 'backgroundJobs'],
  apply(ctx) {
    ctx.effect(() =>
      ctx.ui.command({
        name: 'agents',
        title: 'Background jobs',
        description: 'Show background agents, workflows and shell commands',
        async run() {
          const jobs = ctx.backgroundJobs.list()
          if (!jobs.length) return ctx.ui.notify('No background jobs')
          const job = await ctx.ui.pick(
            'Background jobs',
            jobs.toReversed().map(job => ({ label: job.label, detail: `${job.status} · ${ago(job.started)}`, value: job })),
          )
          if (job?.status !== 'running') return
          job.cancel()
          ctx.ui.notify(`Stopping ${job.label}`)
        },
      }),
    )
  },
})
