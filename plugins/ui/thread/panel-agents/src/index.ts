import { errorMessage, toolCalls } from '@sand/kit'
import { copyWithNotice, shownPanel } from '@sand/kit/web'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { runningCounts } from './runs/counts'
import { modelsUnlike } from './runs/models'
import { toRuns, type Run } from './runs/runs'
import { ticker } from './ticker'
import type { Actions } from './view/parts'
import { agentsView, type ParentLink } from './view/view'

export default definePlugin({
  name: 'panel-agents',
  description: 'Background jobs, sub-agents and workflows of the current thread, with durations and cancel',
  inject: ['threads', 'jobs', 'kit'],
  uses: {
    panels: 'draws its own plain panel',
    turns: 'running foreground sub-agents cannot be stopped',
    models: 'sub-agents on another model do not show it',
    notify: 'failed stops and copies are not reported',
  },
  apply(ctx) {
    const runs = sig<Run[]>([])
    const parent = sig<ParentLink | undefined>(undefined)
    const empty = sig('')
    const clock = ticker()
    let badge = 0
    let asked: string | undefined

    const compute = () => {
      const current = ctx.threads.current()
      empty.set(current ? 'No agents yet' : 'No thread selected')
      if (!current) {
        runs.set([])
        parent.set(undefined)
        return
      }
      runs.set(toRuns(ctx.jobs.runs(current.id), toolCalls(current.entries.values()), modelsUnlike(ctx.models, current.id)))
      const above = current.info.kind === 'agent' && current.info.parent ? ctx.threads.get(current.info.parent) : undefined
      parent.set(above && { id: above.id, title: above.info.title ?? 'thread' })
    }

    const fetchChildren = () => {
      const current = ctx.threads.current()
      if (!current || asked === current.id || !control.shown()) return
      asked = current.id
      void ctx.threads.children(current.id)
    }

    const paint = () => {
      fetchChildren()
      compute()
      clock.set(runs.get().some(run => run.status === 'running'))
      const { agent, shell } = runningCounts(runs.get())
      const count = agent + shell
      if (count === badge) return
      badge = count
      control.update({ badge: count || undefined })
    }

    const interrupt = async (id: string) => {
      if (!ctx.turns) throw new Error('Cannot stop this sub-agent: no turns service')
      return await ctx.turns.interrupt(id)
    }

    const guarded = async (work: () => Promise<boolean>) => {
      try {
        return await work()
      } catch (error) {
        ctx.notify?.push(errorMessage(error), { level: 'error' })
        return false
      }
    }

    const cancel = async (run: Run) => {
      if (!run.job) return run.session ? await interrupt(run.session) : false
      await ctx.jobs.cancel(run.job)
      return true
    }

    const actions: Actions = {
      open: id => void ctx.threads.select(id),
      copy: (text, what) => copyWithNotice(ctx.notify, text, what),
      interrupt: id => guarded(() => interrupt(id)),
      cancel: run => guarded(() => cancel(run)),
    }

    const control = shownPanel(
      ctx,
      { id: 'agents', title: 'Agents', icon: 'bot', order: 20 },
      () => agentsView(ctx.kit, { runs, parent, empty, now: clock.now }, actions),
      paint,
    )
    paint()

    ctx.effect(() => clock.dispose)
    ctx.on('jobs.change', paint)
    ctx.on('threads.change', paint)
    ctx.on('thread.select', paint)
    ctx.on('models.change', paint)
    ctx.watch('models', () => paint())
    ctx.on('thread.change', id => {
      const current = ctx.threads.current()
      if (current && (id === current.id || ctx.threads.get(id)?.info.parent === current.id)) paint()
    })
  },
})
