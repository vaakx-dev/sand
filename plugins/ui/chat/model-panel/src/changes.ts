import { models, modelsChange, threadChange, threadSelect } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import type { PanelContext } from './context'

export const modelChanges = (ctx: PanelContext) => {
  const changes = pulse(ctx, [modelsChange, threadSelect], [models])
  const stateKey = () => JSON.stringify([ctx.models.state(), ctx.threads.current()?.running ?? false])
  let lastKey = stateKey()
  const remember = () => {
    lastKey = stateKey()
  }
  ctx.on(modelsChange, remember)
  ctx.on(threadSelect, remember)
  ctx.on(threadChange, id => {
    if (id !== ctx.threads.current()?.id) return
    const key = stateKey()
    if (key === lastKey) return
    lastKey = key
    changes.bump()
  })
  return changes
}
