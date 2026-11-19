import type { Ledger } from '@sand/ledger/contract'
import type { Finish } from './contract'

export const openOutbox = (ledger: Ledger) => {
  const owed = ledger.db.query<{ report: string }, { pc: string }>('select report from thread_reports where pc = $pc order by at')
  const written = ledger.db.query('insert or ignore into thread_reports (request, pc, report, at) values ($request, $pc, $report, $at)')
  const removed = ledger.db.query('delete from thread_reports where pc = $pc and request = $request')

  return {
    put: (pc: string, finish: Finish) => void written.run({ request: finish.clientRequestId, pc, report: JSON.stringify(finish), at: Date.now() }),
    take: (pc: string, delivered: string[]) =>
      ledger.tx(() => {
        for (const request of delivered) removed.run({ pc, request })
        return owed.all({ pc }).map(row => JSON.parse(row.report) as Finish)
      }),
  }
}

export type Outbox = ReturnType<typeof openOutbox>
