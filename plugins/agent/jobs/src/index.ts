import type { BackgroundJobs } from './contract'
import { definePlugin } from 'drydock'
import { jobsUI } from './command'
import { createDelivery } from './deliver'
import { serveJobs } from './serve'
import { createStore } from './store'
import { jobTools } from './tools'

export default definePlugin({
  name: 'jobs',
  description: 'Background agents, workflows and shell commands: their results reach the thread that started them, which can read, message, wait for and stop them',
  inject: ['loop', 'sessions', 'tools'],
  uses: {
    ui: 'there is no /agents command and results that cannot be delivered fail silently',
    steering: 'results for subagents start a new turn instead of joining the running one',
    server: 'the page cannot list or stop background jobs',
  },
  apply(ctx) {
    const delivery = createDelivery(ctx)
    const store = createStore(ctx, delivery)
    const jobs: BackgroundJobs = { start: store.start, resume: store.resume, list: store.list, queued: delivery.queued }
    ctx.provide('backgroundJobs', jobs)
    ctx.on('turn.stop', (session, _result, signal) => (session.kind === 'agent' ? store.idle(session, signal).then(() => undefined) : undefined))
    serveJobs(ctx, store)
    jobTools(ctx, store, delivery)
    ctx.plugin(jobsUI)
  },
})
