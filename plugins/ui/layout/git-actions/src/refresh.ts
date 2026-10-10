import type { WireEvent } from '@sand/protocol'
import type { GitContext, Model } from './model'

export const refreshOnTurns = (ctx: GitContext, model: Model) => {
  let running = false
  let branch: string | undefined

  ctx.on('thread.select', () => {
    running = Boolean(ctx.threads.current()?.running)
    model.refresh()
  })

  ctx.on('thread.change', id => {
    const thread = ctx.threads.current()
    if (thread?.id !== id) return
    if (running && !thread.running) model.refresh()
    running = thread.running
  })

  const moved = (event: WireEvent) => {
    if (event.name === 'worktrees.change') model.refresh()
  }
  ctx.on('wire.event', moved)
  ctx.on('machines.event', (_device, event) => moved(event))

  ctx.on('gitStatus.change', () => {
    const name = model.status.get()?.branch
    const next = name && `${model.target().cwd}\0${name}`
    const sameFolder = branch?.startsWith(`${model.target().cwd}\0`)
    if (next && sameFolder && next !== branch) model.refreshPr()
    branch = next || branch
  })
}
