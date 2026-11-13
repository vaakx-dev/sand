import type { Kit } from '@sand/ui-kit/contract'
import { button, div, type Sig, show, span } from '@vaakx-dev/vrui'
import type { ChatPlace, ChatRow, PcReport, TreeUse, Use } from '../../contract'
import { amount, share } from '../format'

interface Row extends Use {
  key: string
  title: string
  where?: string
  hot?: boolean
  parts: TreeUse[]
}

const kindDots: Record<TreeUse['kind'], string> = { command: 'bg-success-500', app: 'bg-warning-500', sand: 'bg-sky-500', browser: 'bg-sky-500' }

const kindNames: Record<TreeUse['kind'], string> = { command: 'command', app: 'app', sand: 'sand', browser: 'shared' }

const figures = (use: Use, hot = false) => [
  span({ class: ['w-20 shrink-0 text-right', hot ? 'text-sky-400' : ''] }, amount(use.bytes)),
  span({ class: 'w-16 shrink-0 text-right' }, share(use.cpu)),
]

const head = () =>
  div(
    { class: 'flex items-center gap-3 border-b border-neutral-800 bg-neutral-950 px-4 py-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase' },
    span({ class: 'min-w-0 flex-1' }, 'Using the most'),
    span({ class: 'w-20 shrink-0 text-right' }, 'Memory'),
    span({ class: 'w-16 shrink-0 text-right' }, 'CPU'),
  )

const name = (title: string, where: string | undefined, strong: boolean) =>
  span(
    { class: 'flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 font-sans' },
    span({ class: ['truncate text-sm', strong ? 'font-semibold text-neutral-100' : 'font-medium text-neutral-400'] }, title),
    where ? span({ class: 'truncate text-xs text-neutral-500' }, where) : null,
  )

const partRow = (part: TreeUse) =>
  div(
    { class: 'flex items-center gap-3 border-b border-neutral-800 py-2 pr-4 pl-10 font-mono text-xs text-neutral-400 tabular-nums' },
    span({ class: ['h-1.5 w-1.5 shrink-0 rounded-full', kindDots[part.kind]] }),
    span({ class: 'flex min-w-0 flex-1 items-baseline gap-2 font-sans' }, span({ class: 'truncate text-sm text-neutral-200' }, part.label), span({ class: 'text-xs text-neutral-500' }, kindNames[part.kind])),
    ...figures(part),
  )

const chatRows = (chats: ChatRow[], where: Where): Row[] => chats.map((chat, index) => ({ key: chat.conversation, title: chat.title, where: where(chat.place), hot: index === 0, bytes: chat.bytes, cpu: chat.cpu, parts: chat.trees }))

export type Where = (place: ChatPlace) => string

export const usageTable = (kit: Kit, report: PcReport, { open, where }: { open: Sig<ReadonlySet<string>>; where: Where }) => {
  const toggle = (key: string) => open.update(keys => (keys.has(key) ? new Set([...keys].filter(found => found !== key)) : new Set([...keys, key])))

  const row = (entry: Row, strong: boolean) => {
    const expanded = () => open.get().has(entry.key)
    const line = [
      span({ class: 'flex w-3 shrink-0 text-neutral-500' }, entry.parts.length ? kit.chevron(expanded, 12) : null),
      name(entry.title, entry.where, strong),
      ...figures(entry, entry.hot),
    ]
    const look = 'flex w-full items-center gap-3 border-b border-neutral-800 px-4 py-2 text-left font-mono text-xs text-neutral-100 tabular-nums'
    return [
      entry.parts.length ? button({ type: 'button', class: [look, 'hover:bg-neutral-900'], 'aria-expanded': () => String(expanded()), onClick: () => toggle(entry.key) }, ...line) : div({ class: look }, ...line),
      show(expanded, () => div({ class: 'flex flex-col' }, entry.parts.map(partRow))),
    ]
  }

  return div(
    { class: 'flex flex-col' },
    head(),
    chatRows(report.chats, where).map(entry => row(entry, true)),
    row({ key: 'sand', title: 'sand', ...report.sand }, false),
    row({ key: 'other', title: 'Other apps', ...report.other, parts: [] }, false),
  )
}
