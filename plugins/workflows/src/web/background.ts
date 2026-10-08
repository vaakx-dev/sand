import type { JobState, Jobs, ToolBadge, ToolRenderer, ToolView, Transcript } from '@sand/protocol'
import { onInterval } from '@sand/dom'
import { duration } from '@sand/kit'
import type { Context, Dispose } from 'drydock'

const refresh = 5000

const outcomes: Record<Exclude<JobState['status'], 'running'>, ToolBadge> = {
  done: { text: 'done', tone: 'success' },
  failed: { text: 'failed', tone: 'danger' },
  cancelled: { text: 'stopped', tone: 'neutral' },
}

const jobOf = (jobs: Jobs, tool: ToolView) => jobs.list().find(job => job.origin === tool.call.id)

const lineCount = (tool: ToolView) => {
  const text = (tool.result?.content ?? []).map(block => (block.type === 'text' ? block.text : '')).join('\n').trim()
  const lines = text.split('\n').length
  return lines > 1 ? `${lines} lines` : ''
}

const plainMeta = (tool: ToolView) => (tool.status === 'running' ? 'running' : tool.result?.isError ? '' : lineCount(tool))

const plainBadge = (tool: ToolView): ToolBadge | undefined => (tool.status === 'failed' ? { text: 'failed', tone: 'danger' } : undefined)

const withJobs = (base: ToolRenderer, jobs: Jobs): ToolRenderer => ({
  ...base,
  meta(tool) {
    const job = jobOf(jobs, tool)
    if (!job) return plainMeta(tool)
    return `in background · ${duration((job.ended ?? Date.now()) - job.started)}`
  },
  badge(tool) {
    const job = jobOf(jobs, tool)
    return job && job.status !== 'running' ? outcomes[job.status] : plainBadge(tool)
  },
})

const snapshot = (jobs: Jobs) =>
  jobs
    .list()
    .filter(job => job.origin)
    .map(job => `${job.origin}:${job.status}`)
    .join('|')

const anyRunning = (jobs: Jobs) => jobs.list().some(job => job.origin && job.status === 'running')

export const trackJobs = (ctx: Context, transcript: Transcript, name: string, base: ToolRenderer): Dispose => {
  let registered: Dispose | undefined
  const register = (jobs?: Jobs) => {
    void registered?.()
    registered = transcript.tool(name, jobs ? withJobs(base, jobs) : base)
  }
  register()
  const unwatch = ctx.watch('jobs', jobs => {
    if (!jobs) return
    let seen = snapshot(jobs)
    let stopTicking: (() => void) | undefined
    const update = () => {
      register(jobs)
      if (anyRunning(jobs) && !stopTicking) stopTicking = onInterval(() => register(jobs), refresh)
      if (!anyRunning(jobs) && stopTicking) {
        stopTicking()
        stopTicking = undefined
      }
    }
    update()
    const off = ctx.on('jobs.change', () => {
      const next = snapshot(jobs)
      if (next === seen) return
      seen = next
      update()
    })
    return () => {
      void off()
      stopTicking?.()
      register()
    }
  })
  return () => {
    void unwatch()
    void registered?.()
  }
}
