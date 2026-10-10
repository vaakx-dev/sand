import { asPanel, attach, copyText, sig, watchShown, type Shown } from '@sand/dom'
import { errorMessage, toolCalls } from '@sand/kit'
import { definePlugin } from 'drydock'
import { runningAgents } from './counts'
import { modelsUnlike } from './models'
import type { Actions } from './parts'
import { toRuns, type Run } from './runs'
import { ticker } from './ticker'
import { agentsView, type ParentLink } from './view'

export default definePlugin({
  name: 'panel-agents',
  description: 'Background jobs, sub-agents and workflows of the current thread, with durations and cancel',
  inject: ['threads', 'jobs'],
  uses: {
    panels: 'draws its own plain panel',
    turns: 'running foreground sub-agents cannot be stopped',
    models: 'sub-agents on another model do not show it',
  },
  apply(ctx) {
    const runs = sig<Run[]>([])
    const parent = sig<ParentLink | undefined>(undefined)
    const empty = sig('')
    const clock = ticker()
    let badge = 0
    let asked: string | undefined
    const shown = new Set<Shown>()

    const compute = () => {
      const current = ctx.threads.current()
      empty.set(current ? 'No agents yet.' : 'No thread selected.')
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
      if (!current || asked === current.id || ![...shown].some(watch => watch.get())) return
      asked = current.id
      void ctx.threads.children(current.id)
    }

    const paint = () => {
      fetchChildren()
      compute()
      clock.set(runs.get().some(run => run.status === 'running'))
      const count = runningAgents(runs.get())
      if (count !== badge) control.update({ badge: (badge = count) || undefined })
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

    const actions: Actions = {
      open: id => void ctx.threads.select(id),
      copy: async (text, what) => {
        const copied = await copyText(text)
        ctx.notify?.push(copied ? `Copied ${what}` : `Could not copy the ${what}`, { level: copied ? 'info' : 'error' })
      },
      interrupt: id => guarded(() => interrupt(id)),
      cancel: run =>
        guarded(async () => {
          if (run.job) {
            await ctx.jobs.cancel(run.job)
            return true
          }
          return run.session ? await interrupt(run.session) : false
        }),
    }

    compute()
    const control = asPanel(ctx, {
      id: 'agents',
      title: 'Agents',
      icon: 'bot',
      order: 20,
      render(body) {
        const detach = attach(body, () => agentsView({ runs, parent, empty, now: clock.now }, actions))
        const watch = watchShown(body, paint)
        shown.add(watch)
        return () => {
          watch.stop()
          shown.delete(watch)
          detach()
        }
      },
    })
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
