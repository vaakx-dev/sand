import type { ConsoleEntry, LogLevel, NetworkEntry } from '@sand/browser-engine/contract'
import { div, span, type Child, type ClassValue } from '@vaakx-dev/vrui'

const levelTones: Record<LogLevel, string> = {
  log: 'text-neutral-300',
  info: 'text-sky-400',
  warning: 'bg-warning-950/40 text-warning-400',
  error: 'bg-danger-950/40 text-danger-400',
}

const logRow = (tone: ClassValue, ...children: Child[]) =>
  div({ class: ['flex min-w-0 gap-3 border-b border-neutral-800 px-3 py-1 font-mono text-xs', tone] }, ...children)

const failed = (entry: NetworkEntry) => entry.failed !== undefined || (entry.status ?? 0) >= 400

export const consoleRow = (entry: ConsoleEntry) =>
  logRow(
    levelTones[entry.level],
    span({ class: 'min-w-0 flex-1 whitespace-pre-wrap break-words' }, entry.text),
    entry.source ? span({ class: 'max-w-1/3 shrink-0 truncate text-neutral-500', title: entry.source }, entry.source) : null,
  )

export const networkRow = (entry: NetworkEntry) =>
  logRow(
    failed(entry) ? 'bg-danger-950/40 text-danger-400' : 'text-neutral-300',
    span({ class: 'w-12 shrink-0 font-semibold' }, entry.method),
    span({ class: 'w-10 shrink-0 tabular-nums' }, entry.failed ? 'ERR' : String(entry.status ?? '…')),
    span({ class: 'min-w-0 flex-1 truncate', title: entry.url }, entry.url),
    span({ class: 'max-w-1/3 shrink-0 truncate text-neutral-500' }, entry.failed ?? entry.type),
  )
