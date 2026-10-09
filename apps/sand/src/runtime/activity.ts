import type { RuntimeActivity } from '@sand/protocol'
import type { Job, WireJob } from '@sand/agents/contract'
import type { Context } from 'drydock'

const wireJob = ({ cancel: _, ...job }: Job): WireJob => job

export const createActivity = (ctx: Context, changed: (activity: RuntimeActivity) => void) => {
  const turns = new Set<string>()
  const settling = new Set<string>()
  const jobs = new Map<string, WireJob>()
  let timer: Timer | undefined

  const accepted = (id: string) => {
    const session = ctx.sessions?.open(id)
    return Boolean(session && ctx.loop?.active(session))
  }

  const activity = (): RuntimeActivity => {
    for (const id of settling) if (turns.has(id) || !accepted(id)) settling.delete(id)
    const running = [...jobs.values()]
    return { sessions: [...new Set([...turns, ...settling, ...running.map(job => job.parent)])], jobs: running }
  }

  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    changed(activity())
  }

  const schedule = () => {
    timer ??= setTimeout(flush, 0)
  }

  ctx.on('turn.start', session => {
    turns.add(session.id)
    schedule()
  })
  ctx.on('turn.end', session => {
    turns.delete(session.id)
    settling.add(session.id)
    schedule()
  })
  ctx.on('job.start', job => {
    jobs.set(job.id, wireJob(job))
    schedule()
  })
  ctx.on('job.end', job => {
    jobs.delete(job.id)
    settling.add(job.parent)
    schedule()
  })
  ctx.effect(() => () => clearTimeout(timer))

  return {
    activity,
    flush,
    pending: () => timer !== undefined,
    idle: () => !activity().sessions.length,
  }
}
