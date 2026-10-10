import type { Session } from '@sand/sessions-sqlite/contract'
import { errorMessage } from '@sand/kit'
import type { Context } from 'drydock'

interface Pending {
  session: Session
  text: string
}

export const createDelivery = (ctx: Context<'loop'>) => {
  const pending = new Map<string, Pending>()

  const deliver = (session: Session, text: string) => {
    const steered = ctx.steering?.steer(session, text)
    if (steered) return void pending.set(steered, { session, text })
    ctx.loop.run(session, text).catch(error => ctx.ui?.notify(`Could not deliver a background result: ${errorMessage(error)}`, 'error'))
  }

  ctx.on('turn.steer', (_session, _content, id) => {
    pending.delete(id)
  })

  ctx.on('turn.end', session => {
    for (const [id, item] of pending) {
      if (item.session.id !== session.id) continue
      pending.delete(id)
      setTimeout(() => deliver(item.session, item.text))
    }
  })

  return deliver
}
