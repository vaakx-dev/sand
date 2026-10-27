import { jobs, jobsChange } from '@sand/jobs/contract'
import { panels, type PanelHandle } from '@sand/panel/contract'
import { kit } from '@sand/ui-kit/contract'
import { models, modelsChange, threadChange, threads, threadSelect, threadsChange, turns } from '@sand/web-client/contract'
import { mount, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { toolCalls } from './runs/calls'
import { modelsUnlike } from './runs/models'
import { toRuns, type Run } from './runs/runs'
import { ticker } from './ticker'
import type { Actions } from './view/parts'
import { agentsView } from './view/view'

export default definePlugin({
  name: 'agents-panel',
  description: "Agents tab in the right panel: the current thread's background jobs and sub-agents, with durations and stop",
  inject: { kit, threads, jobs },
  apply(ctx) {
    const runs = sig<Run[]>([])
    const empty = sig('')
    const clock = ticker()
    let handle: PanelHandle | undefined
    let badge = 0

    const compute = () => {
      const current = ctx.threads.current()
      empty.set(current ? 'No agents in this thread yet.' : 'No thread open.')
      if (!current) {
        runs.set([])
        return
      }
      runs.set(
        toRuns({
          jobs: ctx.jobs.list(current.id),
          agents: ctx.threads.children(current.id).filter(chat => chat.info.kind === 'agent'),
          calls: toolCalls(current.entries.values()),
          modelOf: modelsUnlike(ctx.get(models), current.id),
        }),
      )
    }

    const paint = () => {
      compute()
      const count = runs.get().filter(run => run.status === 'running').length
      clock.set(count > 0)
      if (count === badge) return
      badge = count
      handle?.update({ badge: count || undefined })
    }

    const cancel = async (run: Run) => {
      try {
        if (!run.job) return run.session ? ((await ctx.get(turns)?.interrupt(run.session)) ?? false) : false
        await ctx.jobs.cancel(run.job)
        return true
      } catch {
        return false
      }
    }

    const actions: Actions = {
      open: id => void ctx.threads.select(id),
      copy: text => void ctx.kit.copyText(text),
      cancel,
    }

    ctx.watch(panels, host => {
      if (!host) return
      handle = host.panel({
        id: 'agents',
        title: 'Agents',
        icon: 'bot',
        order: 20,
        badge: badge || undefined,
        render: body => mount(body, agentsView(ctx.kit, { runs, empty, now: clock.now }, actions)),
      })
      return () => {
        handle?.dispose()
        handle = undefined
      }
    })
    paint()

    ctx.effect(() => clock.dispose)
    ctx.on(jobsChange, paint)
    ctx.on(threadsChange, paint)
    ctx.on(threadSelect, paint)
    ctx.on(modelsChange, paint)
    ctx.watch(models, () => paint())
    ctx.on(threadChange, id => {
      const current = ctx.threads.current()
      if (current && (id === current.id || ctx.threads.get(id)?.info.parent === current.id)) paint()
    })
  },
})
