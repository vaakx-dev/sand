import { bytes, isArchiveName } from '@sand/kit'
import { copyWithNotice } from '@sand/kit/web'
import type { MenuSpec } from '@sand/protocol'
import type { ContextMenu } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, img, list, span, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { preview } from './content'
import type { Attached, Files } from './files'

type Ctx = Context<'threads' | 'kit'>

const isImage = (item: Attached) => item.content?.type === 'image'

const attachmentMenu = (ctx: Ctx, files: Files, item: Attached): MenuSpec => ({
  title: item.name,
  subtitle: bytes(item.bytes),
  actions: [
    { id: 'copy-name', label: 'Copy name', icon: 'copy', group: 'copy', tile: true, run: () => copyWithNotice(ctx.notify, item.name, 'file name') },
    { id: 'remove', label: 'Remove', icon: 'x', group: 'remove', danger: true, quick: true, run: () => files.remove(item.id) },
  ],
})

const menuOf = (ctx: Ctx, files: Files, menu: ContextMenu, item: Sig<Attached>) => menu.target(() => attachmentMenu(ctx, files, item.get()))

const thumb = (ctx: Ctx, files: Files, menu: ContextMenu, item: Sig<Attached>) => {
  const { closeButton } = ctx.kit
  return span(
    {
      class: 'relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-neutral-600 animate-rise',
      title: () => `${item.get().name} · ${bytes(item.get().bytes)}`,
      ...menuOf(ctx, files, menu, item),
    },
    img({ class: 'h-full w-full object-cover', src: preview(item.get().content) ?? '', alt: item.get().name }),
    closeButton({ title: 'Remove', size: 'sm', class: 'absolute top-1 right-1 bg-black/50', onClick: () => files.remove(item.get().id) }),
  )
}

const kindOf = (item: Attached, sent?: number) => {
  if (item.loading || sent !== undefined) return 'loading'
  if (item.content?.type === 'document' && item.content.mediaType === 'application/pdf') return 'pdf'
  return isArchiveName(item.name) ? 'archive' : 'file'
}

const icons = { pdf: 'file-text', archive: 'file-archive', file: 'file' } as const

const percent = (sent: number, total: number) => Math.floor((sent / Math.max(1, total)) * 100)

const status = (item: Attached, sent?: number) => {
  if (item.error) return item.error
  if (item.loading) return 'Reading…'
  if (sent !== undefined) return `Uploading ${percent(sent, item.bytes)}%`
  return bytes(item.bytes)
}

const progressBar = (item: Sig<Attached>, sent: () => number | undefined) =>
  span(
    { class: 'absolute inset-x-0 bottom-0 h-px overflow-hidden rounded-full bg-neutral-700', hidden: () => sent() === undefined },
    span({ class: 'block h-full bg-accent-500 transition-all', style: { width: () => `${percent(sent() ?? 0, item.get().bytes)}%` } }),
  )

const fileRow = (ctx: Ctx, files: Files, menu: ContextMenu, item: Sig<Attached>) => {
  const { closeButton, icon, spinner } = ctx.kit
  const failed = () => Boolean(item.get().error)
  const sent = () => files.sent.get().get(item.get().id)
  const kind = derive(() => kindOf(item.get(), sent()))
  return div(
    { class: 'relative flex min-h-8 items-center gap-2 text-sm text-neutral-300', ...menuOf(ctx, files, menu, item) },
    span(
      { class: ['inline-flex shrink-0', () => (failed() || kind.get() === 'pdf' ? 'text-danger-400' : 'text-neutral-400')] },
      dynamicChild(kind, value => (value === 'loading' ? spinner(14) : span({ class: 'inline-flex' }, icon(icons[value], 14)))),
    ),
    span({ class: ['min-w-0 flex-1 truncate', () => (failed() ? 'text-danger-300' : '')] }, () => item.get().name),
    span({ class: ['max-w-1/2 shrink-0 truncate text-xs tabular-nums', () => (failed() ? 'text-danger-400' : 'text-neutral-500')] }, () => status(item.get(), sent())),
    closeButton({ title: 'Remove', size: 'sm', onClick: () => files.remove(item.get().id) }),
    progressBar(item, sent),
  )
}

export const shelf = (ctx: Ctx, files: Files) => {
  const { contextMenu } = ctx.kit
  const menu = contextMenu()
  return div(
    { class: 'flex flex-col', hidden: files.items.map(items => !items.length) },
    list(
      files.items.map(items => items.filter(isImage)),
      item => item.id,
      item => thumb(ctx, files, menu, item),
      div({ class: 'mb-3 flex flex-wrap gap-2', hidden: files.items.map(items => !items.some(isImage)) }),
    ),
    list(
      files.items.map(items => items.filter(item => !isImage(item))),
      item => item.id,
      item => fileRow(ctx, files, menu, item),
      div({ class: 'mb-2 flex flex-col', hidden: files.items.map(items => items.every(isImage)) }),
    ),
    menu.view(),
  )
}
