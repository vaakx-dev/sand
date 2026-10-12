import type { FileBlock, UserPart } from '@sand/messages'
import type { TextMenu } from '@sand/transcript-parts/contract'
import { bytes, isArchiveName, oneLine, quoteBlocks } from '@sand/kit'
import type { IconName, Kit } from '@sand/ui-kit/contract'
import { div, span, type Child } from '@vaakx-dev/vrui'
import { actionRow, row, type RowContext, type RowMaker } from './row'

const chip = ({ icon }: Kit, name: string, iconName: IconName, tone: string, iconTone?: string, size?: number) =>
  span(
    { class: ['inline-flex h-8 min-w-0 max-w-full items-center gap-2 rounded-lg px-3 text-xs', tone], title: name },
    span({ class: ['inline-flex shrink-0', iconTone] }, icon(iconName, 13)),
    span({ class: 'min-w-0 truncate' }, name),
    size !== undefined && span({ class: 'shrink-0 text-neutral-500' }, bytes(size)),
  )

const fileChip = (kit: Kit, block: FileBlock) =>
  chip(kit, block.name, isArchiveName(block.name) ? 'file-archive' : 'file', 'bg-neutral-800 text-neutral-300', 'text-neutral-500', block.size)

const attachment = (part: UserPart, context: RowContext) => {
  if (part.kind === 'image')
    return context.parts.image(part.block, context.thread, { class: 'block max-h-32 max-w-48 rounded-lg bg-neutral-800', title: part.block.name ?? '', maxHeight: 128 })
  if (part.kind === 'document') return chip(context.kit, part.block.name ?? 'document', 'file', 'bg-neutral-800 text-neutral-300', 'text-neutral-500')
  if (part.kind === 'file') return fileChip(context.kit, part.block)
  if (part.kind === 'skill') return chip(context.kit, part.name, 'sparkles', 'bg-accent-950 text-accent-400')
  return null
}

const quoted = (text: string, context: RowContext) => {
  const { quoteButton } = context.kit
  return quoteButton(
    {
      class: 'mt-3 w-full first:mt-0',
      title: 'Show where this came from',
      onClick: event => {
        if (event.currentTarget instanceof Element) context.jump(event.currentTarget, text)
      },
    },
    text,
  )
}

const blocks = (text: string, context: RowContext) =>
  quoteBlocks(text)
    .filter(block => block.text)
    .map(block => (block.kind === 'quote' ? quoted(block.text, context) : div({ class: 'mt-3 first:mt-0' }, block.text)))

const bubble = (text: string, press: TextMenu, context: RowContext) =>
  div(
    { class: 'rounded-xl bg-neutral-800 px-4 py-4 text-sm text-box-trim text-neutral-100 whitespace-pre-wrap wrap-anywhere', 'data-quote': '', ...press.props },
    blocks(text, context),
  )

const message = (...children: Child[]) =>
  div({ class: 'group mt-6 mb-3 flex justify-end' }, div({ class: 'flex min-w-0 max-w-2xl flex-col items-end gap-2' }, ...children))

export const userRow: RowMaker<'user'> = (item, context) =>
  row(`user:${item.key}`, item, () => {
    const text = item.parts.flatMap(part => (part.kind === 'text' ? [part.text] : [])).join('\n\n')
    const attachments = item.parts.map(part => attachment(part, context)).filter(Boolean)
    const { menus } = context.parts
    const spec = () => ({
      title: 'Message',
      subtitle: oneLine(text).slice(0, 80),
      actions: [menus.copy('copy', 'Copy message', () => text, 'message'), ...context.reply(text), ...(item.steer ? [] : context.rewrite(item.key, text))],
    })
    const press = menus.text(context.menu, spec)
    return message(
      item.steer && div({ class: 'px-1 text-xs text-neutral-500' }, 'Steered'),
      attachments.length > 0 && div({ class: 'flex flex-wrap justify-end gap-2' }, attachments),
      text && bubble(text, press, context),
      actionRow('-mt-1', menus.more(context.menu, spec)),
    )
  })
