import type {} from '@sand/pc-link/contract'
import { definePlugin } from 'drydock'
import { createSchedules } from './schedules'
import { createStore } from './store'
import { cancelTool, listTool } from './tools/manage'
import { group, scheduleTool, wakeTool } from './tools/schedule'

export default definePlugin({
  name: 'schedules',
  description: 'Scheduled runs and wake-ups: a prompt runs in a thread at a time, after a delay or repeating',
  inject: ['cli', 'sessions', 'followUps', 'tools', 'pcs'],
  uses: { server: 'the page cannot list or cancel schedules' },
  async apply(ctx) {
    const schedules = createSchedules(ctx, await createStore(ctx.cli.home))
    ctx.effect(() => schedules.stop)
    void ctx.settled().then(schedules.start)
    ctx.on('runtime.promote', schedules.start)
    ctx.on('runtime.release', schedules.reload)
    ctx.on('session.remove', session => schedules.drop(session.id))
    ctx.watch('server', server =>
      server?.handle({ 'schedules.add': schedules.add, 'schedules.list': schedules.list, 'schedules.cancel': schedules.cancel }),
    )
    ctx.effect(() =>
      ctx.tools.group({ name: group, label: 'Schedules', summary: 'run a prompt in a thread on any PC later or repeating, and wake yourself up later', load: 'on-demand', mainOnly: true }),
    )
    for (const tool of [scheduleTool(ctx.pcs), wakeTool(schedules), listTool(ctx.pcs), cancelTool(ctx.pcs)]) {
      ctx.effect(() => ctx.tools.register(tool))
    }
  },
})
