import type { ToolRenderer } from '@sand/transcript-parts/contract'
import { definePlugin } from 'drydock'

const agentTool: ToolRenderer = { icon: 'bot', verb: 'Agent', activeVerb: 'Agent' }

export default definePlugin({
  name: 'agents-view',
  description: 'Shows agent calls in the thread with a bot icon and the state of their background run',
  inject: ['toolViews'],
  uses: { transcript: 'agent calls use the generic tool view' },
  apply(ctx) {
    ctx.watch('transcript', transcript => transcript && ctx.toolViews.backgroundJobs(transcript, 'agent', agentTool))
  },
})
