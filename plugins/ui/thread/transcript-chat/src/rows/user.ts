import type { UserPart } from '@sand/messages'
import type { TextMenu } from '@sand/transcript-parts/contract'
import { div, icon, span, type Child, type IconName } from '@sand/dom'
import { oneLine } from '@sand/kit'
import { row, type RowContext, type RowMaker } from './row'

const chip = (name: string, iconName: IconName, tone: string, iconTone?: string) =>
  span(
    { class: ['inline-flex h-8 min-w-0 max-w-full items-center gap-2 rounded-lg px-3 text-xs', tone], title: name },
    span({ class: ['shrink-0', iconTone] }, icon(iconName, 13)),
    span({ class: 'min-w-0 truncate' }, name),
  )

const attachment = (part: UserPart, context: RowContext) => {
  if (part.kind === 'image')
    return context.parts.image(part.block, context.thread, { class: 'block max-h-32 max-w-48 rounded-lg bg-neutral-800', title: part.block.name ?? '', maxHeight: 128 })
  if (part.kind === 'document') return chip(part.block.name ?? 'document', 'file', 'bg-neutral-800 text-neutral-300', 'text-neutral-500')
  if (part.kind === 'skill') return chip(part.name, 'sparkles', 'bg-accent-950 text-accent-400')
  return null
}

const bubble = (text: string, press: TextMenu) =>
  div({ class: 'transcript-chat-bubble rounded-xl bg-neutral-800 px-4 text-sm text-neutral-100 whitespace-pre-wrap wrap-anywhere', ...press.props }, text)

const message = (...children: Child[]) =>
  div({ class: 'my-6 flex justify-end' }, div({ class: 'flex min-w-0 max-w-2xl flex-col items-end gap-2' }, ...children))

export const userRow: RowMaker<'user'> = (item, context) =>
  row(`user:${item.key}`, item, () => {
    const text = item.parts.flatMap(part => (part.kind === 'text' ? [part.text] : [])).join('\n\n')
    const attachments = item.parts.map(part => attachment(part, context)).filter(Boolean)
    const { menus } = context.parts
    const press = menus.text(context.menu, () => ({
      title: 'Message',
      subtitle: oneLine(text).slice(0, 80),
      actions: [menus.copy('copy', 'Copy message', () => text, 'message'), ...(item.steer ? [] : context.rewrite(item.key, text))],
    }))
    return message(
      item.steer && div({ class: 'px-1 text-xs text-neutral-500' }, 'steered'),
      attachments.length > 0 && div({ class: 'flex flex-wrap justify-end gap-2' }, attachments),
      text && bubble(text, press),
    )
  })
