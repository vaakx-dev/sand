import type { FileBlock, UserPart } from '@sand/chats/contract'
import type { Item, TextMenu } from '../parts/contract'
import type { NavAction } from '@sand/nav/contract'
import type { IconName, Kit } from '@sand/ui-kit/contract'
import { bytes, isArchiveName, oneLine, quoteBlocks } from '@sand/util'
import { div, show, span, type Child } from '@vaakx-dev/vrui'
import { actionRow, row, type RowContext, type RowMaker } from './row'

type UserItem = Extract<Item, { kind: 'user' }>

const chip = ({ icon }: Kit, name: string, iconName: IconName, size?: number) =>
  span(
    { class: 'inline-flex h-8 min-w-0 max-w-full items-center gap-2 rounded-md bg-neutral-800 px-3 text-xs text-neutral-100', title: name },
    span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon(iconName, 'sm')),
    span({ class: 'min-w-0 truncate' }, name),
    size !== undefined && span({ class: 'shrink-0 text-neutral-500' }, bytes(size)),
  )

const fileChip = (kit: Kit, block: FileBlock) => chip(kit, block.name, isArchiveName(block.name) ? 'file-archive' : 'file', block.size)

const attachment = (part: UserPart, context: RowContext) => {
  if (part.kind === 'image')
    return context.parts.image(part.block, context.thread, { class: 'block max-h-32 max-w-48 rounded-md bg-neutral-800', title: part.block.name ?? '', maxHeight: 128 })
  if (part.kind === 'document') return chip(context.kit, part.block.name ?? 'document', 'file')
  if (part.kind === 'file') return fileChip(context.kit, part.block)
  if (part.kind === 'skill') return chip(context.kit, part.name, 'sparkles')
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
  div({ class: 'chat-row group mt-6 mb-3 flex justify-end' }, div({ class: 'flex min-w-0 max-w-2xl flex-col items-end gap-2' }, ...children))

export const userMessage = (item: UserItem, context: RowContext, actions: (text: string) => NavAction[]) =>
  row(`user:${item.key}`, item, () => {
    const text = item.parts.flatMap(part => (part.kind === 'text' ? [part.text] : [])).join('\n\n')
    const attachments = item.parts.map(part => attachment(part, context)).filter(Boolean)
    const { menus } = context.parts
    const spec = () => ({ title: 'Message', subtitle: oneLine(text).slice(0, 80), actions: actions(text) })
    const press = menus.text(context.menu, spec)
    return message(
      attachments.length > 0 && div({ class: 'flex flex-wrap justify-end gap-2' }, attachments),
      text && bubble(text, press, context),
      actionRow(
        '-mt-1',
        text && context.kit.copyButton({ text: () => text, size: 'sm' }),
        show(
          () => spec().actions.length > 0,
          () => menus.more(context.menu, spec),
        ),
      ),
    )
  })

export const userRow: RowMaker<'user'> = (item, context) =>
  userMessage(item, context, text => [...context.reply(text), ...(item.steer ? [] : context.rewrite(item.key, text))])
