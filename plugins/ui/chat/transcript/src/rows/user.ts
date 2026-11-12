import { contextLinks, promptLabel, type ContextLink, type ContextRecord, type FileBlock, type UserPart } from '@sand/chats/contract'
import { contextFormats, copyContext } from '@sand/context/contract'
import type { UserItem } from '../contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import { bytes, isArchiveName, quoteBlocks, quotedText } from '@sand/util'
import { selectingIn, type IconName, type Kit, type MenuSpec } from '@sand/ui-kit/contract'
import { div, dynamicChild, span, type Child, type Props, type Sig } from '@vaakx-dev/vrui'
import { actionRow, pressable, row, tapReveal, type RowContext, type RowMaker } from './row'

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
    return context.media(part.block, context.conversation, { class: 'block max-h-32 max-w-48 rounded-md bg-neutral-800', title: part.block.name ?? '', maxHeight: 128 })
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
      'data-markdown': quotedText([{ kind: 'quote', text }]),
      onClick: event => {
        if (event.currentTarget instanceof Element) context.jump(event.currentTarget, text)
      },
    },
    text,
  )
}

const withChips = (text: string, records: ContextRecord[], context: RowContext) => {
  const links = contextLinks(text)
  const recordOf = (link: ContextLink) => records.find(record => record.id === link.id && record.kind === link.kind)
  const linked = links.flatMap((link, index) => [text.slice(links[index - 1]?.end ?? 0, link.start), context.chip(link, recordOf(link))])
  return [...linked, text.slice(links.at(-1)?.end ?? 0)]
}

const blocks = (text: string, records: ContextRecord[], context: RowContext) =>
  quoteBlocks(text)
    .filter(block => block.text)
    .map(block => (block.kind === 'quote' ? quoted(block.text, context) : div({ class: 'mt-3 first:mt-0' }, withChips(block.text, records, context))))

const markdownOf = (node: Node): string => {
  if (node instanceof HTMLElement && node.dataset.markdown) return node.dataset.markdown
  if (node instanceof Text) return node.data
  return [...node.childNodes].map(markdownOf).join('')
}

const selectedMarkdown = (range: Range) => {
  const pieces = [...range.cloneContents().childNodes]
  const separator = pieces.some(piece => piece instanceof HTMLDivElement) ? '\n\n' : ''
  return pieces.map(markdownOf).join(separator)
}

const copySelection = (records: ContextRecord[]) => (event: ClipboardEvent) => {
  const selection = document.getSelection()
  if (!selection?.rangeCount || selection.isCollapsed || !event.clipboardData) return
  if (copyContext(event.clipboardData, selectedMarkdown(selection.getRangeAt(0)), records)) event.preventDefault()
}

const senderOf = (records: ContextRecord[]) => records.find(record => record.data.sent === true)

const withoutSender = (text: string, sender: ContextRecord) => {
  const link = contextLinks(text).find(found => found.id === sender.id && found.kind === sender.kind)
  return link ? (text.slice(0, link.start) + text.slice(link.end)).trim() : text
}

const bubble = (text: string, records: ContextRecord[], props: Props<HTMLDivElement>, context: RowContext) =>
  div(
    {
      ...props,
      class: 'min-w-0 rounded-xl bg-neutral-800 px-3 py-2 text-sm text-neutral-100 whitespace-pre-wrap wrap-anywhere',
      'data-quote': '',
      onCopy: copySelection(records),
    },
    blocks(text, records, context),
  )

interface Relayed {
  sender: ContextRecord
  text: string
  records: ContextRecord[]
  attachments: Child[]
  open: Sig<boolean>
}

const senderLine = ({ plainButton }: Kit, sender: ContextRecord, context: RowContext) =>
  div(
    { class: 'flex min-w-0 max-w-full items-baseline gap-1.5 text-xs text-neutral-400' },
    span({ class: 'shrink-0' }, 'From'),
    plainButton(
      {
        class: 'min-w-0 truncate font-medium text-neutral-100 hover:underline',
        title: sender.label,
        onClick: () => context.open(sender),
      },
      sender.label,
    ),
  )

const relayedBody = ({ text, records, attachments, open }: Relayed, context: RowContext) =>
  dynamicChild(open, opened =>
    opened
      ? div(
          { class: 'mt-1 flex min-w-0 flex-col gap-2 text-neutral-100 whitespace-pre-wrap wrap-anywhere', 'data-quote': '', onCopy: copySelection(records) },
          attachments.length > 0 && div({ class: 'flex flex-wrap gap-2' }, attachments),
          text && div(blocks(text, records, context)),
        )
      : div({ class: 'mt-px truncate text-neutral-400' }, promptLabel(text)),
  )

const relayedQuote = (relayed: Relayed, spec: () => MenuSpec, context: RowContext) => {
  const flip = () => relayed.open.set(!relayed.open.get())
  const fold = (event: MouseEvent) => {
    if (!selectingIn(event.currentTarget) && !pressable(event.target)) flip()
  }
  const foldByKey = (event: KeyboardEvent) => {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    flip()
  }
  return div(
    {
      ...context.menu.target(spec, fold, 'text'),
      class: 'flex min-w-0 max-w-full cursor-pointer gap-3 py-1 text-sm',
      role: 'button',
      tabIndex: 0,
      'aria-expanded': () => String(relayed.open.get()),
      onKeyDown: foldByKey,
    },
    span({ class: 'w-1 shrink-0 rounded-full bg-neutral-700 group-hover:bg-neutral-600' }),
    div({ class: 'flex min-w-0 flex-col' }, senderLine(context.kit, relayed.sender, context), relayedBody(relayed, context)),
  )
}

export const userMessage = (item: UserItem, context: RowContext, actions: (text: string) => MenuAction[], note?: () => Child) =>
  row(`user:${item.key}`, item, () => {
    const { copyButton } = context.kit
    const text = item.parts.flatMap(part => (part.kind === 'text' ? [part.text] : [])).join('\n\n')
    const records = item.parts.flatMap(part => (part.kind === 'context' ? part.records : []))
    const attachments = item.parts.map(part => attachment(part, context)).filter(Boolean)
    const sender = senderOf(records)
    const shown = sender ? withoutSender(text, sender) : text
    const spec = () => ({ title: 'Message', subtitle: promptLabel(shown).slice(0, 80), actions: actions(shown) })
    const reveal = tapReveal()
    const relayed = sender && { sender, text: shown, records, attachments, ...context.states.get(`user:${item.key}`) }
    return div(
      { class: ['chat-row group mt-2 mb-2 flex flex-col gap-2', relayed ? 'items-start pr-16 md:pr-32' : 'items-end pl-16 md:pl-32'] },
      !relayed && attachments.length > 0 && div({ class: 'flex flex-wrap justify-end gap-2' }, attachments),
      relayed
        ? relayedQuote(relayed, spec, context)
        : shown && div({ class: 'min-w-0 max-w-full' }, bubble(shown, records, context.menu.target(spec, reveal.onClick, 'text'), context)),
      actionRow(
        () => (relayed ? relayed.open.get() : reveal.tapped.get()),
        '-mt-1',
        shown && copyButton({ text: () => shown, formats: () => contextFormats(shown, records), size: 'sm' }),
        context.menu.button(spec, { size: 'sm' }),
      ),
      note?.(),
      !item.steer && context.branchSwitch?.(item.key),
    )
  })

const userActions = (item: UserItem, context: RowContext) => (text: string) => {
  const replies = context.reply?.(text) ?? []
  if (item.steer || !context.rewrite) return replies
  return [...replies, ...context.rewrite(item.key, text)]
}

export const userRow: RowMaker<'user'> = (item, context) => userMessage(item, context, userActions(item, context))
