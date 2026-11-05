import type { Session } from '@sand/chats/contract'
import { turnEnd, type SendResult } from '@sand/turns-contract/contract'
import type { JobsContext } from './context'
import type { Job } from './contract'

interface Notice {
  session: Session
  sent: Promise<SendResult | undefined>
}

export const createDelivery = (ctx: JobsContext) => {
  const notices = new Map<string, Notice>()

  ctx.on(turnEnd, session => {
    for (const [job, notice] of notices) if (notice.session.id === session.id) notices.delete(job)
  })

  ctx.effect(() => () => notices.clear())

  return {
    post(job: Job, session: Session, text: string) {
      const sent = ctx.turns.send(session, { prompt: text, origin: 'job', clientRequestId: `${job.id}@${job.ended}` }).catch(error => {
        ctx.report(error)
        return undefined
      })
      notices.set(job.id, { session, sent })
    },
    record(session: Session, text: string) {
      session.append('message', { role: 'user', content: [{ type: 'text', text }] })
    },
    withdraw(job: string) {
      const notice = notices.get(job)
      if (!notice) return
      notices.delete(job)
      void notice.sent.then(result => {
        if (result && 'pending' in result) ctx.turns.withdraw(notice.session, result.pending)
      })
    },
  }
}

export type Delivery = ReturnType<typeof createDelivery>
