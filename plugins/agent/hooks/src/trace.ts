import type { Session } from '@sand/sessions-sqlite/contract'
import type { HookRecord, HookTrace } from './contract'

export interface OpenTrace {
  turn: string | null
  records: HookRecord[]
  pending: Set<Promise<unknown>>
  track(work: Promise<unknown>): void
}

const openTrace = (): OpenTrace => {
  const pending = new Set<Promise<unknown>>()
  return {
    turn: null,
    records: [],
    pending,
    track(work) {
      pending.add(work)
      void work.finally(() => pending.delete(work))
    },
  }
}

export const traceBook = () => {
  const open = new Map<string, OpenTrace>()

  const write = (session: Session, trace: OpenTrace) => {
    if (trace.records.length) session.append('hooks', { turn: trace.turn, records: trace.records } satisfies HookTrace)
  }

  return {
    current: (session: Session | undefined) => (session ? open.get(session.id) : undefined),
    begin(session: Session) {
      open.set(session.id, openTrace())
    },
    start(session: Session) {
      const trace = open.get(session.id)
      if (trace) trace.turn = session.head
    },
    finish(session: Session) {
      const trace = open.get(session.id)
      if (!trace) return
      open.delete(session.id)
      if (!trace.pending.size) return write(session, trace)
      return Promise.allSettled([...trace.pending]).then(() => write(session, trace))
    },
    clear: () => open.clear(),
  }
}

export type TraceBook = ReturnType<typeof traceBook>
