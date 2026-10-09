import { badge, chevron, copyButton, div, fold, icon, oneLine, rowButton, show, span } from '@sand/dom'
import { row, type RowContext } from './row'

export interface Card {
  key: string
  icon: string
  kind: string
  name: string
  text: string
  status?: string
  failed?: boolean
}

const summary = (text: string) => oneLine(text.split('\n').find(line => line.trim())?.replace(/^[#>*\-\s`]+|[*`]+/g, '') ?? '', 140)

const whole = (text: string, context: RowContext) =>
  fold(
    { lines: text.split('\n').length, chars: text.length, copy: () => text, copyLabel: 'Copy' },
    div({ class: 'markdown' }, context.markdown.nodes(text)),
  )

const section = (text: string, key: string, context: RowContext) => {
  const { open, toggle } = context.states.get(key)
  return div(
    { class: 'rounded-lg bg-neutral-900' },
    rowButton(
      { class: 'min-h-8 gap-2 rounded-lg px-2 text-sm text-neutral-200 hover:bg-neutral-800', onClick: toggle },
      chevron(() => open.get()),
      span({ class: 'min-w-0 flex-1 truncate' }, summary(text)),
    ),
    show(open, () => div({ class: 'px-3 pt-1 pb-3' }, div({ class: 'markdown' }, context.markdown.nodes(text)), div({ class: 'mt-2' }, copyButton({ text: () => text, label: 'Copy' })))),
  )
}

const tones = { done: 'success', completed: 'success', failed: 'danger', cancelled: 'neutral' } as const

const statusBadge = (status: string) => badge(tones[status as keyof typeof tones] ?? 'neutral', status.charAt(0).toUpperCase() + status.slice(1))

export const cardRow = (card: Card, context: RowContext) =>
  row(card.key, card.text, () => {
    const sections = context.parts.sections(card.text)
    return div(
      { class: ['mt-2 mb-4 flex gap-3 rounded-xl p-3 text-sm text-neutral-300', card.failed ? 'bg-danger-950' : 'bg-accent-950'] },
      span({ class: 'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-900 text-accent-400' }, icon(card.icon, 15)),
      div(
        { class: 'min-w-0 flex-1' },
        div(
          { class: ['flex min-h-6 items-center gap-2 text-xs', card.text && 'mb-2'] },
          span({ class: 'shrink-0 font-medium text-neutral-100' }, card.kind),
          span({ class: 'min-w-0 truncate text-neutral-400', title: card.name }, card.name),
          card.status && statusBadge(card.status),
          sections.length > 1 && span({ class: 'shrink-0 text-neutral-500' }, `${sections.length} results`),
        ),
        sections.length > 1
          ? div(
              { class: 'flex flex-col gap-1' },
              sections.map((text, index) => section(text, `${card.key}:${index}`, context)),
            )
          : card.text && whole(sections[0] ?? '', context),
      ),
    )
  })
