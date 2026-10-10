import { asPanel, attach, onInterval, sig, watchShown, type Shown } from '@sand/dom'
import { errorMessage, toolCalls } from '@sand/kit'
import { definePlugin } from 'drydock'
import { modelsUnlike } from './models'
import { agentRows, type AgentRow } from './rows'
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
    const rows = sig<AgentRow[]>([])
    const parent = sig<ParentLink | undefined>(undefined)
    const empty = sig('')
    const now = sig(Date.now())
    let badge = 0
    let stopTicking: (() => void) | undefined
    let asked: string | undefined
    const shown = new Set<Shown>()

    const running = () => rows.get().filter(row => row.status === 'running').length

    const compute = () => {
      const current = ctx.threads.current()
      empty.set(current ? 'No agents yet.' : 'No thread selected.')
      if (!current) {
        rows.set([])
        parent.set(undefined)
        return
      }
      const children = ctx.threads.list().filter(thread => thread.info.kind === 'agent' && thread.info.parent === current.id)
      rows.set(agentRows(ctx.jobs.list(current.id), children, toolCalls(current.entries.values()), modelsUnlike(ctx.models, current.id)))
      const above = current.info.kind === 'agent' && current.info.parent ? ctx.threads.get(current.info.parent) : undefined
      parent.set(above && { id: above.id, title: above.info.title ?? 'thread' })
    }

    const tick = () => {
      const active = running() > 0
      if (active && !stopTicking) stopTicking = onInterval(() => now.set(Date.now()), 1000)
      if (!active && stopTicking) {
        stopTicking()
        stopTicking = undefined
      }
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
      now.set(Date.now())
      tick()
      const count = running()
      if (count !== badge) control.update({ badge: (badge = count) || undefined })
    }

    const actions = {
      open: (id: string) => void ctx.threads.select(id),
      async cancel(row: AgentRow) {
        try {
          if (row.job) {
            await ctx.jobs.cancel(row.job)
            return true
          }
          if (!row.session) return false
          if (!ctx.turns) throw new Error('Cannot stop this sub-agent: no turns service')
          return await ctx.turns.interrupt(row.session)
        } catch (error) {
          ctx.notify?.push(errorMessage(error), { level: 'error' })
          return false
        }
      },
    }

    compute()
    const control = asPanel(ctx, {
      id: 'agents',
      title: 'Agents',
      icon: 'bot',
      order: 20,
      render(body) {
        const detach = attach(body, () => agentsView({ rows, parent, empty, now }, actions))
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

    ctx.effect(() => () => stopTicking?.())
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
