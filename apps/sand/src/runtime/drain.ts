import type { RuntimeMessage } from '@sand/protocol'
import type { Context, ScopeView } from 'drydock'

interface DrainOptions {
  idle(): boolean
  pending(): boolean
  send(message: RuntimeMessage): void
}

const rootOf = (scope: ScopeView): ScopeView => (scope.parent ? rootOf(scope.parent) : scope)

export const createDrain = (ctx: Context<'cli'>, { idle, pending, send }: DrainOptions) => {
  let draining = false
  let waiting = false
  let done = false

  const settle = (root: ScopeView) => {
    if (waiting) return
    waiting = true
    void root.idle().then(() => {
      waiting = false
      check()
    })
  }

  const check = () => {
    if (!draining || done || pending() || !idle()) return
    const root = rootOf(ctx.scope)
    if (!root.quiet()) return settle(root)
    done = true
    send({ type: 'drained' })
    ctx.cli.exit(0)
  }

  const start = () => {
    draining = true
    ctx.emit('runtime.drain')
    check()
  }

  return { start, check }
}
