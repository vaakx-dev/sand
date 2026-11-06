import type { MediaView } from '@sand/media/web/contract'
import type { ContextMenu, Kit, MenuSpec } from '@sand/ui-kit/contract'
import { bytes, isArchiveName } from '@sand/util'
import { derive, div, dynamicChild, img, list, scoped, show, span, type Sig } from '@vaakx-dev/vrui'
import { contentName, type Held } from './contract'

export interface Tray {
  items: Sig<Held[]>
  thread(): string | undefined
  errorOf(item: Held): string | undefined
  sentOf(item: Held): number | undefined
  remove(item: Held): void
}

export interface ViewParts {
  kit: Kit
  media: MediaView | undefined
  tray: Tray
  picker: HTMLElement
}

const thumbClass = 'h-full w-full object-cover'

const previewable = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'])

const nameOf = (item: Held) => (item instanceof File ? item.name : contentName(item))

const sizeOf = (item: Held) => {
  if (item instanceof File) return item.size
  if (item.type === 'text') return item.text.length
  return item.type === 'context' ? 0 : item.size
}

const isThumb = (media: MediaView | undefined) => (item: Held) => (item instanceof File ? previewable.has(item.type) : item.type === 'image' && Boolean(media))

const isPdf = (item: Held) => (item instanceof File ? item.name.toLowerCase().endsWith('.pdf') : item.type === 'document' && item.mediaType === 'application/pdf')

const attachmentMenu = ({ copyText }: Kit, tray: Tray, item: Held): MenuSpec => ({
  title: nameOf(item),
  subtitle: bytes(sizeOf(item)),
  actions: [
    { id: 'copy-name', label: 'Copy name', icon: 'copy', group: 'copy', tile: true, run: () => copyText(nameOf(item)) },
    { id: 'remove', label: 'Remove', icon: 'x', group: 'remove', danger: true, quick: true, run: () => tray.remove(item) },
  ],
})

const percent = (sent: number, total: number) => Math.floor((sent / Math.max(1, total)) * 100)

const progressBar = (item: Held, sent: () => number | undefined) =>
  span(
    { class: 'absolute inset-x-0 bottom-0 h-px overflow-hidden rounded-full bg-neutral-700', hidden: () => sent() === undefined },
    span({ class: 'block h-full bg-accent-500 transition-all', style: { width: () => `${percent(sent() ?? 0, sizeOf(item))}%` } }),
  )

const preview = (file: File) => {
  const src = URL.createObjectURL(file)
  scoped(() => URL.revokeObjectURL(src))
  return img({ class: thumbClass, src, alt: file.name })
}

const picture = ({ media, tray }: ViewParts, item: Held) => {
  if (item instanceof File) return preview(item)
  if (media && item.type === 'image') return media.image({ block: item }, tray.thread(), { class: thumbClass, alt: nameOf(item) })
  return img({ class: thumbClass, alt: nameOf(item) })
}

const status = (item: Held, error: string | undefined, sent: number | undefined) => {
  if (error) return error
  if (sent !== undefined) return `Uploading ${percent(sent, sizeOf(item))}%`
  return bytes(sizeOf(item))
}

const thumb = (parts: ViewParts, menu: ContextMenu, item: Held) => {
  const { kit, tray } = parts
  const error = () => tray.errorOf(item)
  const sent = () => tray.sentOf(item)
  return span(
    {
      class: 'relative block h-16 w-16 shrink-0 overflow-hidden rounded-md ring-1 ring-neutral-700',
      title: () => `${nameOf(item)} · ${status(item, error(), sent())}`,
      ...menu.target(() => attachmentMenu(kit, tray, item)),
    },
    picture(parts, item),
    show(
      () => Boolean(error()),
      () => span({ class: 'absolute inset-0 flex items-center justify-center bg-black/50 text-danger-400' }, kit.icon('alert', 'md')),
    ),
    kit.closeButton({ title: 'Remove', size: 'sm', class: 'absolute top-1 right-1 bg-black/50', onClick: () => tray.remove(item) }),
    progressBar(item, sent),
  )
}

const kindOf = (item: Held, failed: boolean, sent: number | undefined) => {
  if (failed) return 'failed'
  if (sent !== undefined) return 'loading'
  if (isPdf(item)) return 'pdf'
  return isArchiveName(nameOf(item)) ? 'archive' : 'file'
}

const icons = { failed: 'alert', pdf: 'file-text', archive: 'file-archive', file: 'file' } as const

const fileRow = ({ kit, tray }: ViewParts, menu: ContextMenu, item: Held) => {
  const error = () => tray.errorOf(item)
  const sent = () => tray.sentOf(item)
  const failed = () => Boolean(error())
  const kind = derive(() => kindOf(item, failed(), sent()))
  return div(
    { class: 'relative flex min-h-8 items-center gap-2 text-sm text-neutral-100', ...menu.target(() => attachmentMenu(kit, tray, item)) },
    span(
      { class: ['inline-flex shrink-0', () => (failed() ? 'text-danger-400' : 'text-neutral-400')] },
      dynamicChild(kind, value => (value === 'loading' ? kit.spinner('md') : kit.icon(icons[value], 'md'))),
    ),
    span({ class: 'min-w-0 flex-1 truncate' }, nameOf(item)),
    span({ class: ['max-w-1/2 shrink-0 truncate text-xs tabular-nums', () => (failed() ? 'text-danger-400' : 'text-neutral-500')] }, () => status(item, error(), sent())),
    kit.closeButton({ title: 'Remove', size: 'sm', surface: 'raised', onClick: () => tray.remove(item) }),
    progressBar(item, sent),
  )
}

export const shelfView = (parts: ViewParts) => {
  const { items } = parts.tray
  const menu = parts.kit.contextMenu()
  const thumbed = isThumb(parts.media)
  return div(
    { class: 'flex flex-col', hidden: items.map(held => !held.length) },
    list(
      items.map(held => held.filter(thumbed)),
      item => item,
      item => thumb(parts, menu, item.get()),
      div({ class: 'mb-3 flex flex-wrap gap-2', hidden: items.map(held => !held.some(thumbed)) }),
    ),
    list(
      items.map(held => held.filter(item => !thumbed(item))),
      item => item,
      item => fileRow(parts, menu, item.get()),
      div({ class: 'mb-2 flex flex-col', hidden: items.map(held => held.every(thumbed)) }),
    ),
    menu.view(),
    parts.picker,
  )
}
