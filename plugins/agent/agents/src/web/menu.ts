import type { ToolView } from '@sand/transcript-chat/contract'
import type { Jobs } from '@sand/web-client/contract'
import { errorMessage, type NavAction } from '@sand/dom'
import type { Context } from 'drydock'

export const jobActions =
  (ctx: Context, jobs: Jobs) =>
  (tool: ToolView): NavAction[] => {
    const job = jobs.list().find(found => found.origin === tool.call.id)
    if (job?.status !== 'running') return []
    return [
      {
        id: 'stop',
        label: 'Stop',
        icon: 'stop',
        group: 'run',
        danger: true,
        run: () => jobs.cancel(job.id).catch(error => ctx.notify?.push(`Could not stop: ${errorMessage(error)}`, { level: 'error' })),
      },
    ]
  }
