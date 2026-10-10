import { div, icon, popoverItem, span, type Child } from '@sand/dom'
import type { PrSummary } from '@sand/github/contract'
import { messages } from '../actions/messages'
import { sendMessage, type ActionContext } from '../actions/send'

const shownFailures = 4

const separator = () => div({ class: 'mx-2 my-1 border-t border-neutral-700' })

const row = (mark: Child, ...text: Child[]) => div({ class: 'flex min-w-0 items-center gap-2 px-2 py-1 text-xs text-neutral-300' }, mark, ...text)

const mark = (tone: string, glyph: string) => span({ class: ['inline-flex shrink-0', tone] }, icon(glyph, 12))

const quiet = (text: string) => div({ class: 'px-2 py-1 text-xs text-neutral-500' }, text)

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const checkRows = (pr: PrSummary) => {
  const { passed, failed, pending } = pr.checks
  if (!passed && !failed && !pending) return [quiet('No checks')]
  const extra = pr.failing.length - shownFailures
  return [
    ...pr.failing.slice(0, shownFailures).map(name => row(mark('text-danger-400', 'x'), span({ class: 'truncate' }, name))),
    extra > 0 ? quiet(`${extra} more failing`) : null,
    passed ? row(mark('text-success-400', 'check'), `${plural(passed, 'check')} passed`) : null,
    pending ? row(mark('text-warning-400', 'working'), `${plural(pending, 'check')} running`) : null,
  ]
}

const openRows = (pr: PrSummary) => [
  ...checkRows(pr),
  pr.unresolved ? row(mark('text-warning-400', 'message'), plural(pr.unresolved, 'unresolved comment')) : null,
  pr.mergeState === 'DIRTY' ? row(mark('text-warning-400', 'alert'), `Conflicts with ${pr.base}`) : null,
  pr.mergeState === 'BEHIND' ? quiet(`Behind ${pr.base}`) : null,
  pr.draft ? quiet('Draft') : null,
  pr.review === 'REVIEW_REQUIRED' ? quiet('Waiting for review') : null,
  pr.review === 'CHANGES_REQUESTED' ? quiet('Changes requested') : null,
]

const item = (label: string, run: () => void, close: () => void, glyph?: string) =>
  popoverItem(
    {
      onClick: () => {
        close()
        run()
      },
    },
    glyph ? span({ class: 'inline-flex text-neutral-500' }, icon(glyph, 14)) : null,
    label,
  )

export const prDetails = (ctx: ActionContext, pr: PrSummary | undefined, close: () => void) => {
  if (!pr) return div()
  const open = pr.state === 'open'
  return div(
    { class: 'flex flex-col' },
    div(
      { class: 'flex min-w-0 items-center gap-2 px-2 pt-2 pb-1 text-xs' },
      span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('compare', 13)),
      span({ class: 'shrink-0 font-semibold text-neutral-100' }, `#${pr.number}`),
      span({ class: 'truncate text-neutral-400' }, pr.title),
    ),
    ...(open ? openRows(pr) : [quiet(pr.state === 'merged' ? `Merged into ${pr.base}` : 'Closed')]),
    separator(),
    open ? item('Babysit until green', () => void sendMessage(ctx, messages.babysit), close) : null,
    open ? item('Babysit, then merge', () => void sendMessage(ctx, messages.babysitMerge), close) : null,
    item('Open on GitHub', () => void window.open(pr.url, '_blank', 'noopener'), close, 'external'),
  )
}
