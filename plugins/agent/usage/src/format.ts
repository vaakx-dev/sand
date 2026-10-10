import type { Limits, LimitWindow } from '@sand/llm-accounts/contract'
import type { ReportRow } from '@sand/server/contract'
import { coarseDuration, windowText } from '@sand/kit'

const statusText = (status?: string) => {
  if (!status || status === 'allowed') return undefined
  if (status === 'allowed_warning') return 'near limit'
  if (status === 'rejected') return 'limit reached'
  return status.replaceAll('_', ' ')
}

const windowRow = (window: LimitWindow): ReportRow => ({
  kind: 'bar',
  label: window.label,
  fraction: 1 - window.used,
  value: [windowText(window), statusText(window.status)].filter(Boolean).join(' · '),
})

const updatedText = (limits: Limits) =>
  Date.now() - limits.updated < 60_000 ? 'Updated just now' : `Updated ${coarseDuration(Date.now() - limits.updated)} ago`

export const report = (all: Limits[], nameOf: (limits: Limits) => string): ReportRow[] =>
  all.flatMap(limits => [
    ...(all.length > 1 ? [{ kind: 'text', text: nameOf(limits) } satisfies ReportRow] : []),
    ...limits.windows.map(windowRow),
    { kind: 'text', text: updatedText(limits) } satisfies ReportRow,
  ])
