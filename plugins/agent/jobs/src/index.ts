import { definePlugin } from 'drydock'
import { inject } from './context'
import { backgroundJobs, type BackgroundJobs } from './contract'
import { createDelivery } from './deliver'
import { serveJobs } from './serve'
import { createStore } from './store'
import { jobTools } from './tools'

export default definePlugin({
  name: 'jobs',
  description: 'Background agents: their results reach the thread that started them, which can read, message, wait for and stop them',
  inject,
  apply(ctx) {
    const delivery = createDelivery(ctx)
    const store = createStore(ctx, delivery)
    const jobs: BackgroundJobs = { start: store.start, resume: store.resume, list: store.list }
    ctx.provide(backgroundJobs, jobs)
    serveJobs(ctx, store)
    jobTools(ctx, store, delivery)
  },
})
