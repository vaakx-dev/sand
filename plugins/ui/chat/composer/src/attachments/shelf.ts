import { mediaView } from '@sand/media/web/contract'
import type { ContextMenu, Kit, MenuSpec } from '@sand/ui-kit/contract'
import { bytes, isArchiveName } from '@sand/util'
import { derive, div, dynamicChild, img, list, show, span, type Sig } from '@vaakx-dev/vrui'
import type { ComposerContext as Ctx } from '../context'
import type { Attached, Files } from './files'

const thumbClass = 'h-full w-full object-cover'

const isThumb = (ctx: Ctx) => (item: Attached) => Boolean(item.preview || (item.content?.type === 'image' && ctx.get(mediaView)))

const attachmentMenu = ({ copyText }: Kit, files: Files, item: Attached): MenuSpec => ({
  title: item.name,
  subtitle: bytes(item.bytes),
  actions: [
    { id: 'copy-name', label: 'Copy name', icon: 'copy', group: 'copy', tile: true, run: () => copyText(item.name) },
    { id: 'remove', label: 'Remove', icon: 'x', group: 'remove', danger: true, quick: true, run: () => files.remove(item.id) },
  ],
})

const menuOf = (kit: Kit, files: Files, menu: ContextMenu, item: Sig<Attached>) => menu.target(() => attachmentMenu(kit, files, item.get()))

const percent = (sent: number, total: number) => Math.floor((sent / Math.max(1, total)) * 100)

const progressBar = (item: Sig<Attached>, sent: () => number | undefined) =>
  span(
    { class: 'absolute inset-x-0 bottom-0 h-px overflow-hidden rounded-full bg-neutral-700', hidden: () => sent() === undefined },
    span({ class: 'block h-full bg-accent-500 transition-all', style: { width: () => `${percent(sent() ?? 0, item.get().bytes)}%` } }),
  )

const picture = (ctx: Ctx, { preview, content, name }: Attached) => {
  if (preview) return img({ class: thumbClass, src: preview, alt: name })
  const view = ctx.get(mediaView)
  if (view && content?.type === 'image') return view.image({ block: content }, ctx.threads.current()?.id, { class: thumbClass, alt: name })
  return img({ class: thumbClass, alt: name })
}

const thumbTitle = (item: Attached, sent?: number) => {
  if (item.error) return `${item.name} · ${item.error}`
  if (sent !== undefined) return `${item.name} · Uploading ${percent(sent, item.bytes)}%`
  return `${item.name} · ${bytes(item.bytes)}`
}

const thumb = (ctx: Ctx, files: Files, menu: ContextMenu, item: Sig<Attached>) => {
  const { closeButton, icon } = ctx.kit
  const sent = () => files.sent.get().get(item.get().id)
  return span(
    {
      class: 'relative block h-16 w-16 shrink-0 overflow-hidden rounded-md ring-1 ring-neutral-700',
      title: () => thumbTitle(item.get(), sent()),
      ...menuOf(ctx.kit, files, menu, item),
    },
    picture(ctx, item.get()),
    show(
      () => Boolean(item.get().error),
      () => span({ class: 'absolute inset-0 flex items-center justify-center bg-black/50 text-danger-400' }, icon('alert', 'md')),
    ),
    closeButton({ title: 'Remove', size: 'sm', class: 'absolute top-1 right-1 bg-black/50', onClick: () => files.remove(item.get().id) }),
    progressBar(item, sent),
  )
}

const isPdf = ({ content, name }: Attached) =>
  content?.type === 'document' ? content.mediaType === 'application/pdf' : !content && name.toLowerCase().endsWith('.pdf')

const kindOf = (item: Attached, sent?: number) => {
  if (item.error) return 'failed'
  if (sent !== undefined) return 'loading'
  if (isPdf(item)) return 'pdf'
  return isArchiveName(item.name) ? 'archive' : 'file'
}

const icons = { failed: 'alert', pdf: 'file-text', archive: 'file-archive', file: 'file' } as const

const status = (item: Attached, sent?: number) => {
  if (item.error) return item.error
  if (sent !== undefined) return `Uploading ${percent(sent, item.bytes)}%`
  return bytes(item.bytes)
}

const fileRow = (ctx: Ctx, files: Files, menu: ContextMenu, item: Sig<Attached>) => {
  const { closeButton, icon, spinner } = ctx.kit
  const failed = () => Boolean(item.get().error)
  const sent = () => files.sent.get().get(item.get().id)
  const kind = derive(() => kindOf(item.get(), sent()))
  return div(
    { class: 'relative flex min-h-8 items-center gap-2 text-sm text-neutral-100', ...menuOf(ctx.kit, files, menu, item) },
    span(
      { class: ['inline-flex shrink-0', () => (failed() ? 'text-danger-400' : 'text-neutral-400')] },
      dynamicChild(kind, value => (value === 'loading' ? spinner('md') : icon(icons[value], 'md'))),
    ),
    span({ class: 'min-w-0 flex-1 truncate' }, () => item.get().name),
    span({ class: ['max-w-1/2 shrink-0 truncate text-xs tabular-nums', () => (failed() ? 'text-danger-400' : 'text-neutral-500')] }, () => status(item.get(), sent())),
    closeButton({ title: 'Remove', size: 'sm', surface: 'raised', onClick: () => files.remove(item.get().id) }),
    progressBar(item, sent),
  )
}

export const shelf = (ctx: Ctx, files: Files) => {
  const { contextMenu } = ctx.kit
  const menu = contextMenu()
  const thumbed = isThumb(ctx)
  return div(
    { class: 'flex flex-col', hidden: files.items.map(items => !items.length) },
    list(
      files.items.map(items => items.filter(thumbed)),
      item => item.id,
      item => thumb(ctx, files, menu, item),
      div({ class: 'mb-3 flex flex-wrap gap-2', hidden: files.items.map(items => !items.some(thumbed)) }),
    ),
    list(
      files.items.map(items => items.filter(item => !thumbed(item))),
      item => item.id,
      item => fileRow(ctx, files, menu, item),
      div({ class: 'mb-2 flex flex-col', hidden: files.items.map(items => items.every(thumbed)) }),
    ),
    menu.view(),
  )
}
