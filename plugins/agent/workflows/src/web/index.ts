import type { ToolRenderer } from '@sand/transcript-chat/contract'
import { definePlugin } from 'drydock'
import { trackJobs } from './background'

const workflowTool: ToolRenderer = { icon: 'workflow', verb: 'Workflow', activeVerb: 'Workflow' }

export default definePlugin({
  name: 'workflows-view',
  description: 'Shows workflow calls in the thread with a workflow icon and the state of their background run',
  uses: { transcript: 'workflow calls use the generic tool view', jobs: 'a background workflow call shows a tick as soon as it starts' },
  apply(ctx) {
    ctx.watch('transcript', transcript => transcript && trackJobs(ctx, transcript, 'workflow', workflowTool))
  },
})
