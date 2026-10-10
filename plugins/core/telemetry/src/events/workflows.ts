import type { Context } from 'drydock'
import type { Capture } from '../capture'

interface Running {
  at: number
  agents: number
}

export const watchWorkflows = (ctx: Context, capture: Capture) => {
  const running = new Map<string, Running>()

  ctx.on('workflow.start', ({ origin }) => void running.set(origin, { at: Date.now(), agents: 0 }))

  ctx.on('workflow.end', ({ origin, resumed, background }, status) => {
    const workflow = running.get(origin)
    if (!workflow) return
    running.delete(origin)
    capture('workflow.finished', { result: status, duration_ms: Date.now() - workflow.at, agents: workflow.agents, resumed, background })
  })

  const claim = (origin: string | null) => {
    const workflow = origin ? running.get(origin) : undefined
    if (workflow) workflow.agents++
  }

  const has = (origin: string | null) => Boolean(origin && running.has(origin))

  return { claim, has }
}
