import { pulse } from '@sand/dom'
import type { PanelContext } from './actions'

export const modelChanges = (ctx: PanelContext) => {
  const changes = pulse(ctx, ['models.change', 'thread.select'], ['models'])
  const stateKey = () => JSON.stringify([ctx.models.state(), ctx.threads.current()?.running ?? false])
  let lastKey = stateKey()
  const remember = () => {
    lastKey = stateKey()
  }
  ctx.on('models.change', remember)
  ctx.on('thread.select', remember)
  ctx.on('thread.change', id => {
    if (id !== ctx.threads.current()?.id) return
    const key = stateKey()
    if (key === lastKey) return
    lastKey = key
    changes.bump()
  })
  return changes
}
