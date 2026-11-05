import { toolViews, transcript, type ToolBadge, type ToolRenderer, type ToolView } from '@sand/chat/contract'
import { jobs, jobsChange, type JobStatus } from '@sand/jobs/contract'
import { kit } from '@sand/ui-kit/contract'
import { pulse } from '@sand/reactive'
import { definePlugin } from 'drydock'

export default definePlugin({
  name: 'shell-jobs-view',
  description: 'Shows run_background calls in the chat with the state of their background command, its last output line and stop',
  inject: { kit, toolViews },
  apply(ctx) {
    const changes = pulse(ctx, [jobsChange], [jobs])
    const jobOf = (tool: ToolView) => {
      changes.version.get()
      return ctx.get(jobs)?.list().find(job => job.origin === tool.call.id)
    }
    const command = (tool: ToolView) => ctx.toolViews.field(tool.call.input, 'command')
    const outcomes: Record<JobStatus, ToolBadge | undefined> = {
      running: undefined,
      done: undefined,
      failed: { text: ctx.kit.statusLabel('failed'), tone: 'danger' },
      cancelled: { text: ctx.kit.statusLabel('cancelled'), tone: 'neutral' },
    }

    const renderer: ToolRenderer = {
      icon: 'term',
      verb: 'Started',
      activeVerb: 'Starting',
      label: tool => ctx.toolViews.field(tool.call.input, 'label') || (command(tool).split('\n')[0] ?? ''),
      meta(tool) {
        const job = jobOf(tool)
        if (job?.status !== 'running') return ''
        return job.note ?? ctx.kit.statusLabel('running')
      },
      badge(tool) {
        const job = jobOf(tool)
        if (job) return outcomes[job.status]
        return tool.status === 'failed' ? outcomes.failed : undefined
      },
      copy: command,
      actions(tool) {
        const job = jobOf(tool)
        if (job?.status !== 'running') return []
        return [{ id: 'stop', label: 'Stop', icon: 'stop', group: 'run', danger: true, tile: true, run: () => void ctx.get(jobs)?.cancel(job.id) }]
      },
    }

    ctx.watch(transcript, found => found?.tool('run_background', renderer))
  },
})
