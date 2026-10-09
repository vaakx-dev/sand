import type { UsageSummary, Wire } from '@sand/protocol'
import { errorMessage, sig } from '@sand/dom'
import { queryFor, type Range } from './range'

export const summaryLoader = (wire: Wire) => {
  const summary = sig<UsageSummary | undefined>(undefined)
  const busy = sig(false)
  const failure = sig('')
  let latest = 0

  const load = (range: Range) => {
    const request = ++latest
    const current = () => request === latest
    busy.set(true)
    wire
      .call<UsageSummary>({ type: 'usage.summary', ...queryFor(range) })
      .then(result => {
        if (!current()) return
        summary.set(result)
        failure.set('')
      })
      .catch(error => {
        if (current()) failure.set(errorMessage(error))
      })
      .finally(() => {
        if (current()) busy.set(false)
      })
  }

  return { summary, busy, failure, load }
}

export type SummaryLoader = ReturnType<typeof summaryLoader>
