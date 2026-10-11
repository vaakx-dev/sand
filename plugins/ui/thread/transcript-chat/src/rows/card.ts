import { badge, chevron, copyButton, div, fold, icon, oneLine, rowButton, show, span, type IconName, type Tone } from '@sand/dom'
import { capital } from '@sand/kit'
import { row, type RowContext } from './row'

export interface Card {
  key: string
  icon: IconName
  kind: string
  name: string
  text: string
  status?: string
  failed?: boolean
}

const tones: Record<string, Tone> = { done: 'success', completed: 'success', failed: 'danger', cancelled: 'neutral' }

const summary = (text: string) => oneLine(text.split('\n').find(line => line.trim())?.replace(/^[#>*\-\s`]+|[*`]+/g, '') ?? '', 140)

const markdown = (text: string, context: RowContext) => div({ class: 'markdown' }, context.markdown.nodes(text, context.images()))

const whole = (text: string, context: RowContext) =>
  fold({ lines: text.split('\n').length, chars: text.length, copy: () => text, copyLabel: 'Copy' }, markdown(text, context))

const section = (text: string, key: string, context: RowContext, held: () => boolean) => {
  const { open, toggle } = context.states.get(key)
  return div(
    { class: 'rounded-lg bg-neutral-900' },
    rowButton(
      {
        class: 'min-h-8 gap-2 rounded-lg px-2 text-sm text-neutral-200 hover:bg-neutral-800',
        onClick: () => {
          if (!held()) toggle()
        },
      },
      chevron(() => open.get()),
      span({ class: 'min-w-0 flex-1 truncate' }, summary(text)),
    ),
    show(open, () => div({ class: 'px-3 pt-1 pb-3' }, markdown(text, context), div({ class: 'mt-2' }, copyButton({ text: () => text, label: 'Copy' })))),
  )
}

const results = (card: Card, sections: string[], context: RowContext, held: () => boolean) => {
  if (sections.length > 1) return div({ class: 'flex flex-col gap-1' }, sections.map((text, index) => section(text, `${card.key}:${index}`, context, held)))
  return card.text && whole(sections[0] ?? '', context)
}

export const cardRow = (card: Card, context: RowContext) =>
  row(card.key, card.text, () => {
    const sections = context.parts.sections(card.text)
    const { menus } = context.parts
    const press = menus.text(context.menu, () => ({ title: card.kind, subtitle: card.name, actions: [menus.copy('copy', 'Copy result', () => card.text, 'result')] }))
    return div(
      {
        class: ['mt-2 mb-4 flex gap-3 rounded-xl p-3 text-sm text-neutral-300', card.failed ? 'bg-danger-950' : 'bg-accent-950'],
        ...(card.text ? press.props : {}),
      },
      span({ class: 'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-900 text-accent-400' }, icon(card.icon, 15)),
      div(
        { class: 'min-w-0 flex-1' },
        div(
          { class: ['flex min-h-6 items-center gap-2 text-xs', card.text && 'mb-2'] },
          span({ class: 'shrink-0 font-medium text-neutral-100' }, card.kind),
          span({ class: 'min-w-0 truncate text-neutral-400', title: card.name }, card.name),
          card.status && badge(tones[card.status] ?? 'neutral', capital(card.status)),
          sections.length > 1 && span({ class: 'shrink-0 text-neutral-500' }, `${sections.length} results`),
        ),
        results(card, sections, context, press.held),
      ),
    )
  })
