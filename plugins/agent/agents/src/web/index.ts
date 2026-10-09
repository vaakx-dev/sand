import type { ToolRenderer } from '@sand/transcript-chat/contract'
import { definePlugin } from 'drydock'
import { trackJobs } from './background'

const agentTool: ToolRenderer = { icon: 'bot', verb: 'Agent', activeVerb: 'Agent' }

export default definePlugin({
  name: 'agents-view',
  description: 'Shows agent calls in the thread with a bot icon and the state of their background run',
  uses: { transcript: 'agent calls use the generic tool view', jobs: 'a background agent call shows a tick as soon as it starts' },
  apply(ctx) {
    ctx.watch('transcript', transcript => transcript && trackJobs(ctx, transcript, 'agent', agentTool))
  },
})
