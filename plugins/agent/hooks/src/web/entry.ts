import type { Entry } from '@sand/messages'
import { chevron, div, rowButton, show, sig, span } from '@sand/dom'
import type { HookRecord, HookTrace } from '../contract'
import { summary } from './summary'

const tones: Partial<Record<HookRecord['outcome'], string>> = {
  denied: 'text-danger-400',
  failed: 'text-danger-400',
  skipped: 'text-warning-400',
}

const recordRow = (record: HookRecord) =>
  div(
    { class: 'flex min-w-0 items-baseline gap-2' },
    span({ class: 'min-w-0 shrink truncate font-mono', title: record.source }, record.source),
    span({ class: 'shrink-0 font-mono text-neutral-500' }, record.hook),
    span({ class: ['shrink-0', tones[record.outcome] ?? 'text-neutral-400'] }, record.outcome),
    record.detail ? span({ class: 'min-w-0 flex-1 truncate', title: record.detail }, record.detail) : span({ class: 'flex-1' }),
    span({ class: 'shrink-0 tabular-nums text-neutral-600' }, `${record.ms} ms`),
  )

export const hooksEntry = (entry: Entry) => {
  const trace = entry.data as HookTrace
  if (!trace?.records?.length) return undefined
  const open = sig(false)
  const line = summary(trace.records)
  return div(
    { class: 'my-1 text-xs text-neutral-500' },
    rowButton(
      { class: 'gap-1 rounded-md px-1 py-px hover:text-neutral-400', title: line, 'aria-expanded': () => String(open.get()), onClick: () => open.set(!open.get()) },
      chevron(() => open.get(), 12),
      span({ class: 'min-w-0 truncate' }, `Hooks: ${line}`),
    ),
    show(open, () => div({ class: 'mt-1 flex flex-col gap-px pl-5' }, ...trace.records.map(recordRow))),
  )
}
