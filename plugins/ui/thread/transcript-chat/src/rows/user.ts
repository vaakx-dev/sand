import type { UserPart } from '@sand/messages'
import { div, icon, span } from '@sand/dom'
import { row, type RowContext, type RowMaker } from './row'

const chip = 'inline-flex h-8 min-w-0 max-w-full items-center gap-2 rounded-lg px-3 text-xs'

const attachment = (part: UserPart, context: RowContext) => {
  if (part.kind === 'image')
    return context.parts.image(part.block, context.thread, {
      class: 'block max-h-32 max-w-48 rounded-lg bg-neutral-800',
      title: part.block.name ?? '',
      maxHeight: 128,
    })
  if (part.kind === 'document') {
    const name = part.block.name ?? 'document'
    return span(
      { class: [chip, 'bg-neutral-800 text-neutral-300'], title: name },
      span({ class: 'shrink-0 text-neutral-500' }, icon('file', 13)),
      span({ class: 'min-w-0 truncate' }, name),
    )
  }
  if (part.kind === 'skill')
    return span({ class: [chip, 'bg-accent-950 text-accent-400'], title: part.name }, span({ class: 'shrink-0' }, icon('sparkles', 13)), span({ class: 'min-w-0 truncate' }, part.name))
  return null
}

const label = (text: string) => div({ class: 'px-1 text-xs text-neutral-500' }, text)

const bubble = (text: string) => div({ class: 'transcript-chat-bubble rounded-xl bg-neutral-800 px-4 text-sm text-neutral-100 whitespace-pre-wrap wrap-anywhere' }, text)

const message = (...children: (HTMLElement | false | null | '')[]) =>
  div({ class: 'my-6 flex justify-end' }, div({ class: 'flex min-w-0 max-w-2xl flex-col items-end gap-2' }, ...children))

export const userRow: RowMaker<'user'> = (item, context) => {
  const text = item.parts.flatMap(part => (part.kind === 'text' ? [part.text] : [])).join('\n\n')
  const attachments = item.parts.map(part => attachment(part, context)).filter(Boolean)
  return row(`user:${item.key}`, item, () =>
    message(
      item.steer && label('steered'),
      attachments.length > 0 && div({ class: 'flex flex-wrap justify-end gap-2' }, attachments),
      text && bubble(text),
    ),
  )
}
