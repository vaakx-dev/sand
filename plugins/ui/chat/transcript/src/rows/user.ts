import { contextLinks, promptLabel, type ContextLink, type ContextRecord, type FileBlock, type UserPart } from '@sand/chats/contract'
import { contextFormats, copyContext } from '@sand/context/contract'
import type { UserItem } from '../contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import type { IconName, Kit } from '@sand/ui-kit/contract'
import { bytes, isArchiveName, quoteBlocks, quotedText } from '@sand/util'
import { derive, div, dynamicChild, show, span, type Child, type Props } from '@vaakx-dev/vrui'
import { actionRow, row, tapReveal, type RowContext, type RowMaker } from './row'

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

const sentBy = (records: ContextRecord[]) => (link: ContextLink) =>
  records.some(record => record.id === link.id && record.kind === link.kind && record.data.sent === true)

const withoutSent = (text: string, records: ContextRecord[]) =>
  contextLinks(text)
    .filter(sentBy(records))
    .reduceRight((rest, link) => rest.slice(0, link.start) + rest.slice(link.end), text)
    .trim()

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

export const userMessage = (item: UserItem, context: RowContext, actions: (text: string) => MenuAction[], note?: () => Child) =>
  row(`user:${item.key}`, context.sender?.(item.key), from => {
    const { copyButton, metaLine } = context.kit
    const text = item.parts.flatMap(part => (part.kind === 'text' ? [part.text] : [])).join('\n\n')
    const records = item.parts.flatMap(part => (part.kind === 'context' ? part.records : []))
    const attachments = item.parts.map(part => attachment(part, context)).filter(Boolean)
    const shown = derive(() => (from.get() ? withoutSent(text, records) : text))
    const { menus } = context
    const spec = () => ({ title: 'Message', subtitle: promptLabel(shown.get()).slice(0, 80), actions: actions(shown.get()) })
    const press = menus.text(context.menu, spec)
    const reveal = tapReveal()
    return div(
      { class: 'chat-row group mt-5 mb-3 flex flex-col items-end gap-2 pl-12 md:pl-24' },
      show(
        () => Boolean(from.get()),
        () => div({ class: '-mb-1 flex min-w-0 max-w-full px-1' }, metaLine(() => `From ${from.get()}`)),
      ),
      attachments.length > 0 && div({ class: 'flex flex-wrap justify-end gap-2' }, attachments),
      div(
        { class: 'flex min-w-0 max-w-full items-end gap-1' },
        actionRow(
          () => reveal.tapped.get(),
          '',
          show(
            () => Boolean(shown.get()),
            () => copyButton({ text: () => shown.get(), formats: () => contextFormats(shown.get(), records), size: 'sm' }),
          ),
          show(
            () => spec().actions.length > 0,
            () => menus.more(context.menu, spec),
          ),
        ),
        dynamicChild(shown, value => (value ? bubble(value, records, { ...press.props, onClick: reveal.onClick }, context) : null)),
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
