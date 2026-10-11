import type { ToolRenderer } from '@sand/transcript-parts/contract'
import { definePlugin } from 'drydock'

const workflowTool: ToolRenderer = { icon: 'workflow', verb: 'Workflow', activeVerb: 'Workflow' }

export default definePlugin({
  name: 'workflows-view',
  description: 'Shows workflow calls in the thread with a workflow icon and the state of their background run',
  inject: ['toolViews'],
  uses: { transcript: 'workflow calls use the generic tool view' },
  apply(ctx) {
    ctx.watch('transcript', transcript => transcript && ctx.toolViews.backgroundJobs(transcript, 'workflow', workflowTool))
  },
})
