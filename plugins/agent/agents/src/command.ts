import { definePlugin } from 'drydock'
import { ago } from '@sand/kit'

export const agentsUI = definePlugin({
  name: 'agents-ui',
  inject: ['ui', 'agents'],
  apply(ctx) {
    ctx.effect(() =>
      ctx.ui.command({
        name: 'agents',
        title: 'Background agents',
        description: 'Show background agents and workflows',
        async run() {
          const jobs = ctx.agents.jobs()
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
