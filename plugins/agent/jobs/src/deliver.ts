import type { Session } from '@sand/chats/contract'
import { turnEnd } from '@sand/loop/contract'
import { steering, turnSteer, turnUnsteer } from '@sand/steering/contract'
import type { JobsContext } from './context'

interface Notice {
  job: string
  session: Session
  text: string
  steer?: string
}

export const createDelivery = (ctx: JobsContext) => {
  const notices = new Map<string, Notice>()
  const timers = new Set<Timer>()

  const flush = (session: Session) => {
    if (ctx.loop.active(session)) return
    const due = [...notices.values()].filter(notice => notice.session.id === session.id && !notice.steer)
    if (!due.length) return
    for (const notice of due) notices.delete(notice.job)
    ctx.loop
      .run(
        session,
        due.map(notice => ({ type: 'text', text: notice.text })),
      )
      .catch(error => ctx.report(error))
  }

  const later = (session: Session) => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      flush(session)
    })
    timers.add(timer)
  }

  const forget = (steer: string) => {
    for (const notice of notices.values()) if (notice.steer === steer) notices.delete(notice.job)
  }

  ctx.on(turnSteer, (_session, _content, id) => forget(id))
  ctx.on(turnUnsteer, (_session, id) => forget(id))

  ctx.on(turnEnd, session => {
    const own = [...notices.values()].filter(notice => notice.session.id === session.id)
    for (const notice of own) delete notice.steer
    if (own.length) later(session)
  })

  ctx.effect(() => () => {
    timers.forEach(clearTimeout)
    timers.clear()
    notices.clear()
  })

  return {
    post(job: string, session: Session, text: string) {
      const steer = session.kind === 'agent' ? ctx.get(steering)?.steer(session, text) : undefined
      notices.set(job, { job, session, text, ...(steer && { steer }) })
      if (!steer) flush(session)
    },
    record(session: Session, text: string) {
      session.append('message', { role: 'user', content: [{ type: 'text', text }] })
    },
    withdraw(job: string) {
      const notice = notices.get(job)
      if (!notice) return
      notices.delete(job)
      if (notice.steer) ctx.get(steering)?.unsteer(notice.session, notice.steer)
    },
    isNotice: (steer: string) => [...notices.values()].some(notice => notice.steer === steer),
  }
}

export type Delivery = ReturnType<typeof createDelivery>
